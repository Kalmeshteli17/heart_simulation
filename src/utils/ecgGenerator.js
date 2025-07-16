/**
 * Generates synthetic ECG data with realistic PQRST waveform characteristics
 * @param {number} length - Number of data points to generate
 * @param {number} samplingRate - Samples per second (Hz)
 * @param {number} [heartRate=72] - Heart rate in beats per minute (BPM)
 * @returns {Array<{time: number, value: number}>} Array of ECG data points containing:
 *   - time: Time in seconds
 *   - value: ECG voltage measurement at that time
 */
export function generateRealisticECG(length, samplingRate, heartRate = 72) {
  const data = [];
  // Calculate how many samples make up one cardiac cycle
  const samplesPerBeat = (60 / heartRate) * samplingRate;
  
  // Generate each sample point
  for (let i = 0; i < length; i++) {
    // Calculate position within current cardiac cycle (0-1)
    const posInBeat = (i % samplesPerBeat) / samplesPerBeat;
    let value = 0; // Baseline value
    
    // P Wave (Atrial Depolarization)
    if (posInBeat >= 0.1 && posInBeat < 0.2) {
      // Smooth sinusoidal P wave with amplitude 0.25
      value = 0.25 * Math.sin((posInBeat - 0.1) * Math.PI * 10);
    }
    // QRS Complex (Ventricular Depolarization)
    else if (posInBeat >= 0.2 && posInBeat < 0.3) {
      // Initial Q wave (negative deflection)
      value = -0.2 * Math.sin((posInBeat - 0.2) * Math.PI * 20);
      
      // Main R wave (large positive spike)
      if (posInBeat >= 0.22 && posInBeat < 0.28) {
        value = 1.5 * Math.sin((posInBeat - 0.22) * Math.PI * 16.67);
      }
    }
    // T Wave (Ventricular Repolarization)
    else if (posInBeat >= 0.4 && posInBeat < 0.6) {
      // Broad, low-amplitude T wave
      value = 0.3 * Math.sin((posInBeat - 0.4) * Math.PI * 5);
    }
    
    // Add realistic noise to the signal
    value += (Math.random() - 0.5) * 0.05; // ±0.025 noise
    
    data.push({
      time: i / samplingRate, // Convert sample index to seconds
      value: value
    });
  }
  
  return data;
}