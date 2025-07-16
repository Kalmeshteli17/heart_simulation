import React, { useEffect, useRef, useState } from 'react';
import { Chart } from 'chart.js/auto';
import './ReverseECG.css';

const ReverseECG = ({ isPlaying, timeElapsed, currentPhase, realBPM, speedMultiplier = 1 }) => {
  const canvasRef = useRef(null);
  const chartRef = useRef(null);
  const containerRef = useRef(null);
  const animationFrameRef = useRef(null);

  const POINTS_ON_SCREEN = 800;
  const SAMPLE_RATE = 300;
  const REF_LINE_INDEX = 30;

  const [ecgData, setEcgData] = useState(Array(POINTS_ON_SCREEN).fill(0));
  const signalBufferRef = useRef(Array(POINTS_ON_SCREEN).fill(0));
  const waveQueueRef = useRef([]);
  const simTimeRef = useRef(0);
  const lastUpdateTimeRef = useRef(performance.now());

  // Generate synthetic spikes/dips
  const generateSpike = (length, height) =>
    Array.from({ length }, (_, i) => {
      const t = i / (length - 1);
      return height * Math.exp(-60 * Math.pow(t - 0.5, 2));
    });

  const generateDip = (length, depth) =>
    Array.from({ length }, (_, i) => {
      const t = i / (length - 1);
      return -depth * Math.exp(-60 * Math.pow(t - 0.5, 2));
    });

  const pWave = generateSpike(30, 0.3);
  const qDip = generateDip(10, 0.2);
  const rSpike = generateSpike(20, 1.0);
  const sDip = generateDip(10, 0.3);
  const tWave = generateSpike(40, 0.5);

  const blank = (len) => Array(Math.max(0, len)).fill(0);

  const injectQRSComplex = () => {
    const enqueue = arr => arr.forEach(p => waveQueueRef.current.push(p));
    const delayBeforeQ = Math.round(SAMPLE_RATE * 0.2);
    const delayBeforeR = Math.round(SAMPLE_RATE * 0.01);
    const delayAfterS = Math.round(SAMPLE_RATE * 0.01);

    enqueue(blank(delayBeforeQ));
    enqueue(pWave);
    enqueue(blank(Math.max(0, delayBeforeR - pWave.length)));
    enqueue(qDip);
    enqueue(rSpike);
    enqueue(sDip);
    enqueue(blank(delayAfterS));
    enqueue(tWave);
  };

  // Create Chart
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;

    if (!canvas || !container) return;

    const resizeAndInitChart = () => {
      const width = container.clientWidth;
      const height = container.clientHeight;

      if (width === 0 || height === 0) return;

      canvas.width = width;
      canvas.height = height;

      const refLine = Array(POINTS_ON_SCREEN).fill(null);
      refLine[REF_LINE_INDEX] = -1;
      refLine[REF_LINE_INDEX + 1] = 2;

      chartRef.current = new Chart(canvas, {
        type: 'line',
        data: {
          labels: Array(POINTS_ON_SCREEN).fill(''),
          datasets: [
            {
              data: ecgData,
              borderColor: '#00FF40',
              borderWidth: 1.5,
              pointRadius: 0,
              tension: 0,
              fill: false,
            },
            {
              data: refLine,
              borderColor: 'rgba(255, 255, 0, 0.8)',
              borderWidth: 1,
              pointRadius: 0,
              tension: 0,
              fill: false,
              segment: {
                borderColor: ctx =>
                  ctx.p0.parsed.y !== null
                    ? 'rgba(255, 255, 0, 0.8)'
                    : 'transparent'
              }
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          animation: false,
          scales: {
            x: { display: false },
            y: {
              min: -1,
              max: 2,
              ticks: { display: false },
              grid: { color: 'rgba(255,255,255,0.2)' }
            }
          },
          plugins: { legend: { display: false }, tooltip: { enabled: false } }
        }
      });
    };

    const timeout = setTimeout(resizeAndInitChart, 0); // Delay to wait for DOM layout

    return () => {
      clearTimeout(timeout);
      chartRef.current?.destroy();
    };
  }, []);

  // Animation logic
  useEffect(() => {
    if (!isPlaying) {
      cancelAnimationFrame(animationFrameRef.current);
      return;
    }

    const update = (time) => {
      const dt = (time - lastUpdateTimeRef.current) / 1000;
      lastUpdateTimeRef.current = time;
      simTimeRef.current += dt * speedMultiplier;

      const samplesToAdd = Math.floor(simTimeRef.current * SAMPLE_RATE);
      simTimeRef.current -= samplesToAdd / SAMPLE_RATE;

      for (let i = 0; i < samplesToAdd; i++) {
        let next = waveQueueRef.current.length > 0 ? waveQueueRef.current.shift() : 0;
        let noise = (Math.random() * 0.03 - 0.015);
        let baseline = 0.03 * Math.sin(2 * Math.PI * time / 1000 * 0.5);
        signalBufferRef.current.push(next + noise + baseline);
      }

      signalBufferRef.current = signalBufferRef.current.slice(-POINTS_ON_SCREEN);
      setEcgData([...signalBufferRef.current]);
      animationFrameRef.current = requestAnimationFrame(update);
    };

    animationFrameRef.current = requestAnimationFrame(update);
    return () => cancelAnimationFrame(animationFrameRef.current);
  }, [isPlaying, speedMultiplier]);

  // Trigger waveform on QRS
  useEffect(() => {
    if (currentPhase === 'QRS') injectQRSComplex();
  }, [currentPhase]);

  // Update chart
  useEffect(() => {
    if (chartRef.current) {
      chartRef.current.data.datasets[0].data = ecgData;
      chartRef.current.update('none');
    }
  }, [ecgData]);

  return (
    <div className="reverse-ecg-container">
      <h3>Reverse ECG</h3>
      <div className="reverse-ecg-graph-container" ref={containerRef}>
        <canvas ref={canvasRef} className="reverse-ecg-canvas" />
      </div>
      <div className="reverse-ecg-footer">
        <span className="bpm">♥ {realBPM} BPM</span>
        <span className="time">{timeElapsed.toFixed(2)}s</span>
      </div>
    </div>
  );
};

export default ReverseECG;
