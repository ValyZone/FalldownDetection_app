export const FALL_DETECTION_THRESHOLDS = {
  DECELERATION_THRESHOLD: -15.0, // m/s²
  FREEFALL_THRESHOLD: 2.0, // m/s²
  IMPACT_THRESHOLD: 14.22, // m/s²
  MAX_TIME_BETWEEN_PHASES: 2.0, // seconds
  MIN_EVENT_DURATION: 0.2, // seconds (200ms)
  ROLLING_WINDOW_SIZE: 0.1, // seconds (100ms)
};

export const EVENT_TYPES = {
  DECELERATION: 'deceleration',
  FREEFALL: 'freefall',
  IMPACT: 'impact',
  FALL_DETECTED: 'fall_detected',
};

export const AXES = {
  X: 'X',
  Y: 'Y',
  Z: 'Z',
  ABSOLUTE: 'Absolute',
};

export const GRAVITY = 9.81; // m/s²
