/**
 * Statistical Feature Extraction Utilities
 *
 * Helper functions for calculating rolling window statistics, peak detection,
 * and pattern recognition to improve fall detection accuracy and noise filtering.
 */

import { FALL_DETECTION_THRESHOLDS } from './constants.js';

/**
 * Calculate the mean (average) of an array of numbers
 * @param {number[]} values - Array of numerical values
 * @returns {number} Mean value
 */
function calculateMean(values) {
  if (!values || values.length === 0) return 0;
  const sum = values.reduce((acc, val) => acc + val, 0);
  return sum / values.length;
}

/**
 * Calculate the variance of an array of numbers
 * @param {number[]} values - Array of numerical values
 * @param {number} [mean] - Pre-calculated mean (optional, will be calculated if not provided)
 * @returns {number} Variance value
 */
function calculateVariance(values, mean = null) {
  if (!values || values.length === 0) return 0;
  const avg = mean !== null ? mean : calculateMean(values);
  const squaredDiffs = values.map((val) => Math.pow(val - avg, 2));
  return calculateMean(squaredDiffs);
}

/**
 * Calculate the standard deviation of an array of numbers
 * @param {number[]} values - Array of numerical values
 * @returns {number} Standard deviation
 */
function calculateStdDev(values) {
  return Math.sqrt(calculateVariance(values));
}

/**
 * Find the maximum value in an array
 * @param {number[]} values - Array of numerical values
 * @returns {number} Maximum value
 */
function findMax(values) {
  if (!values || values.length === 0) return 0;
  return Math.max(...values);
}

/**
 * Find the minimum value in an array
 * @param {number[]} values - Array of numerical values
 * @returns {number} Minimum value
 */
function findMin(values) {
  if (!values || values.length === 0) return 0;
  return Math.min(...values);
}

/**
 * Extract rolling window data points based on time window
 * @param {Array<{time: number, value: number}>} dataPoints - Array of data points with time and value
 * @param {number} currentIndex - Current index in the data array
 * @param {number} windowSize - Size of the rolling window in seconds
 * @returns {Array<{time: number, value: number}>} Data points within the window
 */
function getRollingWindow(dataPoints, currentIndex, windowSize = FALL_DETECTION_THRESHOLDS.ROLLING_WINDOW_SIZE) {
  const currentTime = dataPoints[currentIndex].time;
  const windowStart = currentTime - windowSize;

  const window = [];
  for (let i = currentIndex; i >= 0; i--) {
    if (dataPoints[i].time >= windowStart) {
      window.push(dataPoints[i]);
    } else {
      break; // Data is time-ordered, so we can break early
    }
  }

  return window.reverse(); // Return in chronological order
}

/**
 * Calculate rolling window statistics for a data series
 * @param {Array<{time: number, value: number}>} dataPoints - Array of data points
 * @param {number} currentIndex - Current index
 * @param {number} windowSize - Window size in seconds
 * @returns {{mean: number, variance: number, stdDev: number, min: number, max: number, count: number}}
 */
export function calculateRollingStats(dataPoints, currentIndex, windowSize = FALL_DETECTION_THRESHOLDS.ROLLING_WINDOW_SIZE) {
  const window = getRollingWindow(dataPoints, currentIndex, windowSize);
  const values = window.map((dp) => dp.value);

  const mean = calculateMean(values);
  const variance = calculateVariance(values, mean);
  const stdDev = Math.sqrt(variance);

  return {
    mean,
    variance,
    stdDev,
    min: findMin(values),
    max: findMax(values),
    count: values.length,
  };
}

/**
 * Detect if a peak (local maximum) occurs at the current index
 * A peak is defined as a value higher than its neighbors within the window
 * @param {Array<{time: number, value: number}>} dataPoints - Array of data points
 * @param {number} currentIndex - Current index to check for peak
 * @param {number} threshold - Minimum value to be considered a peak
 * @param {number} lookback - Number of points to look back/forward (default: 2)
 * @returns {boolean} True if a peak is detected
 */
export function detectPeak(dataPoints, currentIndex, threshold, lookback = 2) {
  if (currentIndex < lookback || currentIndex >= dataPoints.length - lookback) {
    return false; // Not enough data points on either side
  }

  const currentValue = dataPoints[currentIndex].value;

  // Check if value exceeds threshold
  if (currentValue < threshold) {
    return false;
  }

  // Check if this is a local maximum
  for (let i = 1; i <= lookback; i++) {
    if (dataPoints[currentIndex - i].value >= currentValue ||
        dataPoints[currentIndex + i].value >= currentValue) {
      return false; // Not a local maximum
    }
  }

  return true;
}

/**
 * Detect if a valley (local minimum) occurs at the current index
 * @param {Array<{time: number, value: number}>} dataPoints - Array of data points
 * @param {number} currentIndex - Current index to check for valley
 * @param {number} threshold - Maximum value to be considered a valley
 * @param {number} lookback - Number of points to look back/forward (default: 2)
 * @returns {boolean} True if a valley is detected
 */
export function detectValley(dataPoints, currentIndex, threshold, lookback = 2) {
  if (currentIndex < lookback || currentIndex >= dataPoints.length - lookback) {
    return false;
  }

  const currentValue = dataPoints[currentIndex].value;

  if (currentValue > threshold) {
    return false;
  }

  // Check if this is a local minimum
  for (let i = 1; i <= lookback; i++) {
    if (dataPoints[currentIndex - i].value <= currentValue ||
        dataPoints[currentIndex + i].value <= currentValue) {
      return false;
    }
  }

  return true;
}

/**
 * Check if an event duration meets the minimum threshold
 * @param {number} startTime - Event start time in seconds
 * @param {number} endTime - Event end time in seconds
 * @returns {boolean} True if duration meets minimum threshold
 */
export function meetsMinimumDuration(startTime, endTime) {
  const duration = endTime - startTime;
  return duration >= FALL_DETECTION_THRESHOLDS.MIN_EVENT_DURATION;
}

/**
 * Check if two events occur within the maximum time window
 * @param {number} firstEventTime - Time of first event in seconds
 * @param {number} secondEventTime - Time of second event in seconds
 * @returns {boolean} True if events are within the time window
 */
export function withinTimeWindow(firstEventTime, secondEventTime) {
  const timeDiff = Math.abs(secondEventTime - firstEventTime);
  return timeDiff <= FALL_DETECTION_THRESHOLDS.MAX_TIME_BETWEEN_PHASES;
}


/**
 * Calculate the rate of change (derivative) between two consecutive data points
 * @param {number} value1 - First value
 * @param {number} value2 - Second value
 * @param {number} timeDiff - Time difference between points
 * @returns {number} Rate of change per second
 */
export function calculateRateOfChange(value1, value2, timeDiff) {
  if (timeDiff === 0) return 0;
  return (value2 - value1) / timeDiff;
}

