import { generateRealisticECG } from './ecgGenerator';
import { ECG_CONFIG } from '../components/AnimationManage/animationConfig';

/**
 * Calculates stable heart rate (BPM) from cardiac phase interval data
 * @param {Array} intervals - Array of cardiac phase objects containing:
 *   - phase: string (e.g., "QRS")
 *   - entry: number (time in seconds when phase starts)
 *   - duration: number (how long phase lasts)
 * @returns {number} Calculated beats per minute (BPM)
 * @throws {Error} When insufficient data or physiologically impossible values are detected
 */
const calculateStableBPM = (intervals) => {
  // 1. Filter only QRS events with valid timing data
  const qrsEvents = intervals
    .filter(event => 
      event.phase === "QRS" && 
      typeof event.entry === 'number' && 
      typeof event.duration === 'number'
    );

  if (qrsEvents.length < 2) {
    throw new Error('Need at least 2 QRS complexes for accurate calculation');
  }

  // 2. Calculate average RR interval (time between QRS complexes)
  let totalRR = 0;
  let validRRCount = 0;

  for (let i = 1; i < qrsEvents.length; i++) {
    const rrInterval = qrsEvents[i].entry - qrsEvents[i-1].entry;
    // Validate RR interval is within physiologically possible range (0.3-2.0 seconds)
    if (rrInterval > 0.3 && rrInterval < 2.0) {
      totalRR += rrInterval;
      validRRCount++;
    }
  }

  if (validRRCount === 0) {
    throw new Error('No valid RR intervals found');
  }

  // 3. Convert average RR interval to BPM (beats per minute)
  const avgRR = totalRR / validRRCount;
  const bpm = Math.round(60 / avgRR); // 60 seconds / RR interval in seconds

  // 4. Final validation - ensure BPM is within normal physiological range
  if (bpm < 40 || bpm > 180) {
    throw new Error(`Calculated BPM ${bpm} outside valid range`);
  }

  console.log(`Stable BPM: ${bpm} (from ${validRRCount} RR intervals)`);
  return bpm;
};

/**
 * Loads and processes ECG data from server
 * @param {function} setRealBPM - State setter function for BPM value
 * @returns {Array} Generated ECG data points
 * @throws Will fallback to default values if data loading fails
 */
export async function loadEcgData(setRealBPM) {
  try {
    // 1. Load cardiac phase interval data from server
    const response = await fetch('/pqrst_intervals.json');
    if (!response.ok) throw new Error('Failed to load interval data');
    
    const intervalData = await response.json();
    
    // Basic data validation
    if (!Array.isArray(intervalData)) {
      throw new Error('Expected array data');
    }

    // 2. Calculate stable heart rate from intervals
    const stableBPM = calculateStableBPM(intervalData);
    setRealBPM(stableBPM);

    // 3. Generate synthetic ECG data matching this BPM
    return generateRealisticECG(
      1000, // Number of data points to generate
      ECG_CONFIG.SAMPLING_RATE, // Samples per second
      stableBPM // Target heart rate
    );

  } catch (error) {
    console.error('BPM calculation error:', error.message);
    
    // Fallback with warning when real data isn't available
    const fallbackBPM = 72; // Typical resting heart rate
    console.warn(`Using fallback BPM: ${fallbackBPM}`);
    setRealBPM(fallbackBPM);
    return generateRealisticECG(1000, ECG_CONFIG.SAMPLING_RATE, fallbackBPM);
  }
}

/**
 * Loads heart animation timing data from server
 * @returns {Array|null} Cardiac phase interval data or null if loading fails
 */
export async function loadHeartData() {
  try {
    const response = await fetch('/pqrst_intervals.json');
    if (!response.ok) throw new Error('Failed to load heart data');
    
    const data = await response.json();
    
    // Data validation checks
    if (!Array.isArray(data)) throw new Error('Expected array data');
    if (data.length === 0) throw new Error('Empty interval data');
    
    return data;
  } catch (error) {
    console.error('Heart data loading failed:', error.message);
    return null; // Explicit null return for error cases
  }
}