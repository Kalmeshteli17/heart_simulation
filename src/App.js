import React, { useState, useRef, useEffect, useMemo } from 'react';
import HeartModel from './components/HeartModel/HeartModel';
import ECGVisualization from './components/ECGVisualization/ECGVisualization';
import ControlsUI from './components/ControlsUI/ControlsUI';
import AnimationManager from './components/AnimationManage/AnimationManager';
import { loadEcgData, loadHeartData } from './utils/dataLoaders';
import './App.css';
import ReverseECG from './components/ECGVisualization/ReverseECG';

/**
 * Main App component that serves as the root of the application.
 * Manages state and coordinates between different components:
 * - HeartModel: 3D heart visualization
 * - ECGVisualization: ECG graph display
 * - ControlsUI: User interface controls
 * - AnimationManager: Handles animation timing and phases
 */
const App = () => {
  // Refs for accessing child component methods
  const heartModelRef = useRef();  // Reference to HeartModel component
  const animationManagerRef = useRef();  // Reference to AnimationManager component

  // State variables
  const [loading, setLoading] = useState(true);  // Loading state flag
  const [currentPhase, setCurrentPhase] = useState("ST");  // Current cardiac phase (ST, QRS, etc.)
  const [speedMultiplier, setSpeedMultiplier] = useState(1);  // Animation speed multiplier
  const [color, setColor] = useState("#ffffff");  // Light color for heart model
  const [timeElapsed, setTimeElapsed] = useState(0);  // Time elapsed in animation
  const [lightIntensity, setLightIntensity] = useState(1);  // Light intensity for heart model
  const [isPlaying, setIsPlaying] = useState(true);  // Play/pause state
  const [realBPM, setRealBPM] = useState(72);  // Real beats per minute (from ECG data)
  const [virtualBPM, setVirtualBPM] = useState(72);  // Virtual beats per minute (for animation)
  const [ecgData, setEcgData] = useState([]);  // ECG data points
  const [heartData, setHeartData] = useState([]); // Cardiac phase intervals
  const [pqrstIntervals, setPqrstIntervals] = useState([]); // Cardiac phase intervals

  /**
   * Handles play/pause functionality
   * @param {boolean} shouldPlay - Whether the animation should play or pause
   */
  const handlePlayPause = (shouldPlay) => {
    setIsPlaying(shouldPlay);
    if (heartModelRef.current) {
      heartModelRef.current.setPlaying(shouldPlay);
    }
  };

  /**
   * Handles light properties changes
   * @param {string} newColor - New hex color value
   * @param {number} newIntensity - New light intensity value
   */
  const handleLightChange = (newColor, newIntensity) => {
    setColor(newColor);
    setLightIntensity(newIntensity);
    if (heartModelRef.current) {
      heartModelRef.current.updateLight(newColor, newIntensity);
    }
  };

  // Effect hook for initializing the application
  useEffect(() => {
    /**
     * Initializes the application by loading required data
     * and setting up components
     */
    const initializeApp = async () => {
      try {
        // Load ECG and heart data in parallel
        const [ecgData, heartData] = await Promise.all([
          loadEcgData(setRealBPM),
          loadHeartData()
        ]);
        
        setEcgData(ecgData);
        setHeartData(heartData || []);
        
        // Initialize animation manager with heart model's mixer
        if (heartModelRef.current && animationManagerRef.current) {
          animationManagerRef.current.initialize(
            heartModelRef.current.getMixer()
          );
        }
        
        setLoading(false);  // Mark loading as complete
      } catch (error) {
        console.error("Initialization error:", error);
        setLoading(false);
      }
    };

    initializeApp();
  }, []);  // Empty dependency array means this runs only once on mount

  // Load interval data on mount
  useEffect(() => {
    const loadIntervals = async () => {
      try {
        const response = await fetch('/pqrst_intervals.json');
        const intervals = await response.json();
        setPqrstIntervals(intervals);
      } catch (error) {
        console.error('Error loading intervals:', error);
      }
    };
    loadIntervals();
  }, []);

  // Calculate current phase based on ECGVisualization logic
  useEffect(() => {
    if (!pqrstIntervals.length) return;
    // Use ECGVisualization's reference line logic
    const ECG_CONFIG = {
      POINTS: 800,
      SAMPLING_RATE: 300,
      REFERENCE_LINE_POSITION: 50
    };
    const totalPoints = ECG_CONFIG.POINTS;
    const referencePosition = ECG_CONFIG.REFERENCE_LINE_POSITION;
    const timeAtReference = timeElapsed - ((totalPoints - referencePosition) / ECG_CONFIG.SAMPLING_RATE);
    let newPhase = 'ST';
    for (const interval of pqrstIntervals) {
      if (timeAtReference >= interval.entry && timeAtReference < interval.entry + interval.duration) {
        newPhase = interval.phase;
        break;
      }
    }
    setCurrentPhase(newPhase);
  }, [timeElapsed, pqrstIntervals]);

 
  return (
    <div className="app-container">
      {/* Loading indicator */}
      {loading && <div className="loading">Loading Heart Model...</div>}
      
      <div className="main-content">
        {/* 3D Heart Model Component */}
        <div className="model-section">
          <HeartModel 
            ref={heartModelRef}
            color={color}
            lightIntensity={lightIntensity}
            isPlaying={isPlaying}
            speedMultiplier={speedMultiplier}
            onTimeUpdate={setTimeElapsed}
            pqrstIntervals={pqrstIntervals}
            currentPhase={currentPhase}
            timeElapsed={timeElapsed}
          />
        </div>
        
        {/* Control and ECG Section */}
        <div className="control-section">
          {/* Control Panel Component */}
          <ControlsUI
            currentPhase={currentPhase}
            timeElapsed={timeElapsed}
            realBPM={realBPM}
            virtualBPM={virtualBPM}
            speedMultiplier={speedMultiplier}
            setSpeedMultiplier={setSpeedMultiplier}
            color={color}
            lightIntensity={lightIntensity}
            onLightChange={handleLightChange}
            isPlaying={isPlaying}
            setIsPlaying={handlePlayPause}
          />
          
          {/* ECG Visualization Components */}
          <div className="ecg-section">
            <ECGVisualization 
              ecgData={ecgData}
              isPlaying={isPlaying}
              timeElapsed={timeElapsed}
              currentPhase={currentPhase}
              realBPM={realBPM}
              pqrstIntervals={pqrstIntervals}
            />
            </div>
            <div className="reverse-section">
            <ReverseECG
              isPlaying={isPlaying}
              timeElapsed={timeElapsed}
              currentPhase={currentPhase}
              realBPM={realBPM}
              speedMultiplier={speedMultiplier}
            />
          </div>
        </div>
      </div>
      
      {/* Animation Manager Component (handles timing and phases) */}
      <AnimationManager
        ref={animationManagerRef}
        setCurrentPhase={setCurrentPhase}
        setVirtualBPM={setVirtualBPM}
        isPlaying={isPlaying}
        speedMultiplier={speedMultiplier}
      />
    </div>
  );
};

export default App;