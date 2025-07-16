import React from "react";
import "./ControlsUI.css";

/**
 * ControlsUI Component
 * Provides interactive controls for the heart animation visualization
 * 
 * Features:
 * - Play/pause animation control
 * - Animation speed adjustment
 * - Lighting controls (color and intensity)
 * - Real-time display of cardiac phase, BPM, and elapsed time
 * - Responsive UI with intuitive sliders and buttons
 * 
 * @param {Object} props - Component properties
 * @param {string} [props.currentPhase="ST"] - Current cardiac phase (ST, QRS, etc.)
 * @param {number} [props.timeElapsed=0] - Elapsed time in seconds
 * @param {number} [props.realBPM=72] - Real heart rate in beats per minute
 * @param {number} [props.virtualBPM=72] - Virtual/animated heart rate
 * @param {number} [props.speedMultiplier=1] - Animation speed multiplier
 * @param {function} props.setSpeedMultiplier - Callback to update speed
 * @param {string} [props.color="#ffffff"] - Current light color (hex)
 * @param {number} [props.lightIntensity=1] - Current light intensity
 * @param {function} props.onLightChange - Callback for light property changes
 * @param {boolean} [props.isPlaying=true] - Whether animation is playing
 * @param {function} props.setIsPlaying - Callback to toggle play/pause
 */
const ControlsUI = ({
  currentPhase = "ST",
  timeElapsed = 0,
  realBPM = 72,
  virtualBPM = 72,
  speedMultiplier = 1,
  setSpeedMultiplier,
  color = "#ffffff",
  lightIntensity = 1,
  onLightChange,
  isPlaying = true,
  setIsPlaying,
}) => {
  /**
   * Handles color change events
   * @param {Object} e - Change event from color input
   */
  const handleColorChange = (e) => {
    onLightChange(e.target.value, lightIntensity);
  };

  /**
   * Handles light intensity change events
   * @param {Object} e - Change event from range input
   */
  const handleIntensityChange = (e) => {
    onLightChange(color, parseFloat(e.target.value));
  };

  return (
    <div className="ui-box settings-box">
      <h3>Heart Animation Controls</h3>
      
      {/* Status Display Group */}
      <div className="control-group">
        <p>
          Phase:
          <span
            className={`phase-value ${currentPhase}`}
            style={{
              animation: `${currentPhase.toLowerCase()}-pulse 0.5s`,
            }}
            aria-label={`Current cardiac phase: ${currentPhase}`}
          >
            {currentPhase}
          </span>
        </p>
        
        <p>
          Time: <span aria-label={`Elapsed time: ${timeElapsed.toFixed(2)} seconds`}>
            {timeElapsed.toFixed(2)}s
          </span>
        </p>
        
        <p>
          BPM: <span className="bpm-value" aria-label={`Heart rate: ${realBPM} beats per minute`}>
            {realBPM}
          </span> (Virtual: {virtualBPM})
        </p>
      </div>

      {/* Interactive Controls Group */}
      <div className="control-group">
        {/* Speed Control */}
        <label aria-label="Animation speed control">
          Speed:
          <input
            type="range"
            min="0.1"
            max="2"
            step="0.1"
            value={speedMultiplier}
            onChange={(e) => setSpeedMultiplier(parseFloat(e.target.value))}
            aria-valuemin="0.1"
            aria-valuemax="2"
            aria-valuenow={speedMultiplier}
          />
          <span>{speedMultiplier.toFixed(1)}x</span>
        </label>

        {/* Color Picker */}
        <label aria-label="Light color control">
          Light Color:
          <input 
            type="color" 
            value={color} 
            onChange={handleColorChange}
            aria-label="Select light color"
          />
        </label>

        {/* Intensity Control */}
        <label aria-label="Light intensity control">
          Intensity:
          <input
            type="range"
            min="0.1"
            max="5"
            step="0.1"
            value={lightIntensity}
            onChange={handleIntensityChange}
            aria-valuemin="0.1"
            aria-valuemax="5"
            aria-valuenow={lightIntensity}
          />
          <span>{lightIntensity.toFixed(1)}</span>
        </label>
      </div>

      {/* Play/Pause Button */}
      <button
        className={`play-button ${isPlaying ? "pause" : "play"}`}
        onClick={() => setIsPlaying(!isPlaying)}
        aria-label={isPlaying ? "Pause animation" : "Resume animation"}
      >
        {isPlaying ? "⏸ Pause" : "▶ Resume"}
      </button>
    </div>
  );
};

export default ControlsUI;