/**
 * Cardiac Phase Configuration (24-frame version)
 */
export const ECG_CONFIG = {
  POINTS: 500,
  SAMPLING_RATE: 360, // Clinical standard
  COLOR: '#00FF40',
  GRID_COLOR: 'rgba(255, 255, 255, 0.2)',
  PHASE_COLORS: {
    PQ: '#4e79a7',    // Blue for P wave (atrial depolarization)
    QRS: '#e15759',   // Red for QRS complex (ventricular depolarization)
    ST: '#59a14f'     // Green for ST-T (ventricular repolarization)
  }
};

// Updated for 24-frame animation
// Corrected version - Cardiac phases now properly mapped to animation frames
export const PHASE_TO_FRAMES = {
  QRS: [0, 4],    // First 5 frames (20.8% of cycle) - Ventricular depolarization
  PQ: [5, 14],    // Next 10 frames (41.7% of cycle) - Atrial depolarization 
  ST: [15, 24]    // Final 9 frames (37.5% of cycle) - Ventricular repolarization
};

// Update the duration calculations to match new frame mapping
export const getPhaseDurations = (bpm) => {
  const cycleDuration = 60 / bpm;
  return {
    QRS: cycleDuration * 0.21,  // 5/24 frames
    PQ: cycleDuration * 0.42,    // 10/24 frames
    ST: cycleDuration * 0.37     // 9/24 frames
  }; 
};