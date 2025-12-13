/**
 * Fall Detection Algorithm Constants
 *
 * Research-based thresholds for motorcycle fall detection using a three-phase approach.
 * These values are based on published research on motorcycle accident detection and
 * fall detection algorithms.
 *
 * References:
 * - Free-fall acceleration typically drops to ~0.2-0.5g during true falls
 * - Impact forces during motorcycle crashes range from 2-4g minimum
 * - Sudden deceleration during crashes typically exceeds -1.5g
 */

export const FALL_DETECTION_THRESHOLDS = {
  /**
   * Phase 1: Sudden Deceleration Detection
   * Detects when the motorcycle (and phone) suddenly loses speed
   * Threshold: -15 m/s² (approximately -1.53g)
   */
  DECELERATION_THRESHOLD: -15.0, // m/s²

  /**
   * Phase 2: Free-fall Detection
   * Detects weightlessness when the phone is falling through the air
   * Threshold: 2.0 m/s² (approximately 0.2g)
   * Normal gravity is ~9.81 m/s², so values below 2.0 indicate near-weightlessness
   */
  FREEFALL_THRESHOLD: 2.0, // m/s²

  /**
   * Phase 3: Ground Impact Detection
   * Detects the sudden spike in acceleration when hitting the ground
   * Threshold: 14.22 m/s² (approximately 1.45g)
   */
  IMPACT_THRESHOLD: 14.22, // m/s²

  /**
   * Time Windows for Phase Validation
   * Maximum time allowed between sequential phases for a valid fall detection
   */
  MAX_TIME_BETWEEN_PHASES: 2.0, // seconds

  /**
   * Minimum Event Duration
   * Minimum time a condition must be sustained to be considered a valid event
   * This helps filter out sensor noise and brief anomalies
   */
  MIN_EVENT_DURATION: 0.2, // seconds (200ms)

  /**
   * Rolling Window Size for Statistical Analysis
   * Size of the sliding window for calculating statistical features
   */
  ROLLING_WINDOW_SIZE: 0.1, // seconds (100ms)
};

/**
 * Event Type Constants
 */
export const EVENT_TYPES = {
  DECELERATION: 'deceleration',
  FREEFALL: 'freefall',
  IMPACT: 'impact',
  FALL_DETECTED: 'fall_detected',
};

/**
 * Axis Labels
 */
export const AXES = {
  X: 'X',
  Y: 'Y',
  Z: 'Z',
  ABSOLUTE: 'Absolute',
};

/**
 * Standard gravity constant for reference
 */
export const GRAVITY = 9.81; // m/s²
