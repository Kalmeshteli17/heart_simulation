import React, { useEffect, useRef, useState, useMemo } from 'react';
import { Chart } from 'chart.js/auto';
import './ECGVisualization.css';
import EventEmitter from 'events';

// Web Worker for background ECG generation
const createWorker = () => {
  const workerCode = `
    self.onmessage = function(e) {
      const { intervals, samplingRate } = e.data;
      
      const generateECGPoint = (time) => {
        for (const interval of intervals) {
          if (time >= interval.entry && time < interval.entry + interval.duration) {
            const phaseTime = time - interval.entry;
            const phaseProgress = phaseTime / interval.duration;
            
            switch(interval.phase) {
              case 'QRS':
                if (phaseProgress < 0.15) return -0.3 * (1 - Math.cos(phaseProgress/0.15 * Math.PI/2));
                else if (phaseProgress < 0.35) return 1.8 * Math.sin((phaseProgress-0.15)/0.2 * Math.PI);
                else if (phaseProgress < 0.6) return -0.4 * (1 - (phaseProgress-0.35)/0.25);
                else return 0;
              case 'PQ': 
                return 0.2 * Math.sin(Math.PI * phaseProgress * 2.5);
              case 'ST':
                return phaseProgress < 0.4 ? 0.05 : 0.35 * Math.sin((phaseProgress-0.4)/0.6 * Math.PI) * Math.exp(-(phaseProgress-0.4)/0.6*2);
              default: 
                return 0;
            }
          }
        }
        return 0;
      };

      const totalDuration = intervals[intervals.length-1].entry + intervals[intervals.length-1].duration;
      const sampleInterval = 1 / samplingRate;
      const ecgData = [];
      
      for (let time = 0; time < totalDuration; time += sampleInterval) {
        ecgData.push({ time, value: generateECGPoint(time) });
      }
      
      postMessage(ecgData);
    };
  `;
  
  const blob = new Blob([workerCode], { type: 'application/javascript' });
  return new Worker(URL.createObjectURL(blob));
};

const heartEvents = new EventEmitter();
function onHeartPhaseChange(newPhase) {
  heartEvents.emit('phaseChange', newPhase);
}

const ECGVisualization = ({ isPlaying, timeElapsed, realBPM, pqrstIntervals = [], currentPhase }) => {
  const ecgCanvasRef = useRef(null);
  const chartRef = useRef(null);
  const animationRef = useRef();
  const [ecgData, setEcgData] = useState([]);
  const workerRef = useRef();

  // ECG Configuration
  const ECG_CONFIG = useMemo(() => ({
    POINTS: 800,
    SAMPLING_RATE: 300,
    COLOR: '#00FF40',
    GRID_COLOR: 'rgba(255, 255, 255, 0.2)',
    PHASE_COLORS: {
      PQ: '#4e79a7',
      QRS: '#e15759',
      ST: '#59a14f'
    },
    REFERENCE_LINE_COLOR: 'rgba(255, 255, 0, 0.7)',
    REFERENCE_LINE_WIDTH: 2,
    REFERENCE_LINE_POSITION: 50 // Fixed position (in pixels from left)
  }), []);

  // Load interval data
  useEffect(() => {
    const loadIntervals = async () => {
      try {
        const response = await fetch('/pqrst_intervals.json');
        const intervals = await response.json();
        
        workerRef.current = createWorker();
        workerRef.current.postMessage({
          intervals,
          samplingRate: ECG_CONFIG.SAMPLING_RATE
        });
        
        workerRef.current.onmessage = (e) => {
          setEcgData(e.data);
        };
        
      } catch (error) {
        console.error("Error loading data:", error);
      }
    };

    loadIntervals();

    return () => {
      if (workerRef.current) {
        workerRef.current.terminate();
      }
    };
  }, [ECG_CONFIG.SAMPLING_RATE]);

  // Initialize chart with static reference line
  useEffect(() => {
    if (!ecgCanvasRef.current) return;

    // Create vertical line data (fixed at position 50)
    const lineData = Array(ECG_CONFIG.POINTS).fill(null);
    lineData[ECG_CONFIG.REFERENCE_LINE_POSITION] = -0.8; // Bottom
    lineData[ECG_CONFIG.REFERENCE_LINE_POSITION + 1] = 2.2; // Top

    chartRef.current = new Chart(ecgCanvasRef.current.getContext('2d'), {
      type: 'line',
      data: {
        labels: Array(ECG_CONFIG.POINTS).fill(''),
        datasets: [
          // Main ECG line
          {
            data: Array(ECG_CONFIG.POINTS).fill(0),
            borderColor: ECG_CONFIG.COLOR,
            borderWidth: 1.5,
            pointRadius: 0,
            tension: 0,
            fill: false
          },
          // Static reference line
          {
            data: lineData,
            borderColor: ECG_CONFIG.REFERENCE_LINE_COLOR,
            borderWidth: ECG_CONFIG.REFERENCE_LINE_WIDTH,
            pointRadius: 0,
            tension: 0,
            fill: false,
            segment: {
              borderColor: ctx => ctx.p0.parsed.y !== null ? 
                ECG_CONFIG.REFERENCE_LINE_COLOR : 'transparent'
            }
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: 0 },
        scales: {
          x: { display: false },
          y: { 
            min: -0.8,
            max: 2.2,
            grid: { 
              color: ECG_CONFIG.GRID_COLOR,
              lineWidth: 1,
              drawBorder: false
            },
            ticks: { display: false }
          }
        },
        plugins: { 
          legend: { display: false },
          tooltip: { enabled: false }
        }
      }
    });

    return () => chartRef.current?.destroy();
  }, [ECG_CONFIG]);

  // Update ECG waveform (without modifying reference line)
  useEffect(() => {
    if (!chartRef.current || !ecgData.length) return;

    let lastUpdate = 0;
    const updateInterval = 1000 / 30;

    const updateECG = (timestamp) => {
      if (!lastUpdate || timestamp - lastUpdate >= updateInterval) {
        lastUpdate = timestamp;
        
        const sampleIdx = Math.min(
          Math.floor(timeElapsed * ECG_CONFIG.SAMPLING_RATE),
          ecgData.length - 1
        );
        const windowStart = Math.max(0, sampleIdx - ECG_CONFIG.POINTS);
        const displayData = ecgData.slice(windowStart, sampleIdx).map(d => d.value);

        if (displayData.length > 0) {
          chartRef.current.data.datasets[0].data = [
            ...Array(Math.max(0, ECG_CONFIG.POINTS - displayData.length)).fill(0),
            ...displayData
          ];
          
          chartRef.current.data.datasets[0].borderColor = 
            ECG_CONFIG.PHASE_COLORS[currentPhase] || ECG_CONFIG.COLOR;
          
          chartRef.current.update('none');
        }
      }

      animationRef.current = requestAnimationFrame(updateECG);
    };

    if (isPlaying) {
      animationRef.current = requestAnimationFrame(updateECG);
    } else {
      cancelAnimationFrame(animationRef.current);
    }

    return () => cancelAnimationFrame(animationRef.current);
  }, [isPlaying, timeElapsed, ecgData, currentPhase, ECG_CONFIG]);

  return (
    <div className="ecg-container">
      <div className="ecg-header">
        <h3>ECG Monitor</h3>
        {ecgData.length ? (
          <div className="phase-indicator" style={{ 
            backgroundColor: ECG_CONFIG.PHASE_COLORS[currentPhase] || '#666'
          }}>
            {currentPhase} Phase
          </div>
        ) : (
          <div className="loading-text">Loading ECG...</div>
        )}
      </div>
      <div className="ecg-graph">
        <canvas 
          ref={ecgCanvasRef} 
          width={500}
          height={250}
        />
      </div>
      <div className="ecg-footer">
        <span className="bpm">♥ {realBPM} BPM</span>
        <span className="time">{timeElapsed.toFixed(2)}s</span>
      </div>
    </div>
  );
};

export default ECGVisualization;