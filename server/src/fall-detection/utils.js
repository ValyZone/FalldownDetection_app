import { FALL_DETECTION_THRESHOLDS } from './constants.js';

function calculateMean(values) {
  if (!values || values.length === 0) return 0;
  const sum = values.reduce((acc, val) => acc + val, 0);
  return sum / values.length;
}

function calculateVariance(values, mean = null) {
  if (!values || values.length === 0) return 0;
  const avg = mean !== null ? mean : calculateMean(values);
  const squaredDiffs = values.map((val) => Math.pow(val - avg, 2));
  return calculateMean(squaredDiffs);
}

function calculateStdDev(values) {
  return Math.sqrt(calculateVariance(values));
}

function findMax(values) {
  if (!values || values.length === 0) return 0;
  return Math.max(...values);
}

function findMin(values) {
  if (!values || values.length === 0) return 0;
  return Math.min(...values);
}

function getRollingWindow(dataPoints, currentIndex, windowSize = FALL_DETECTION_THRESHOLDS.ROLLING_WINDOW_SIZE) {
  const currentTime = dataPoints[currentIndex].time;
  const windowStart = currentTime - windowSize;

  const window = [];
  for (let i = currentIndex; i >= 0; i--) {
    if (dataPoints[i].time >= windowStart) {
      window.push(dataPoints[i]);
    } else {
      break;
    }
  }

  return window.reverse();
}

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

export function detectPeak(dataPoints, currentIndex, threshold, lookback = 2) {
  if (currentIndex < lookback || currentIndex >= dataPoints.length - lookback) {
    return false;
  }

  const currentValue = dataPoints[currentIndex].value;

  if (currentValue < threshold) {
    return false;
  }

  for (let i = 1; i <= lookback; i++) {
    if (dataPoints[currentIndex - i].value >= currentValue ||
        dataPoints[currentIndex + i].value >= currentValue) {
      return false;
    }
  }

  return true;
}

export function detectValley(dataPoints, currentIndex, threshold, lookback = 2) {
  if (currentIndex < lookback || currentIndex >= dataPoints.length - lookback) {
    return false;
  }

  const currentValue = dataPoints[currentIndex].value;

  if (currentValue > threshold) {
    return false;
  }

  for (let i = 1; i <= lookback; i++) {
    if (dataPoints[currentIndex - i].value <= currentValue ||
        dataPoints[currentIndex + i].value <= currentValue) {
      return false;
    }
  }

  return true;
}

export function meetsMinimumDuration(startTime, endTime) {
  const duration = endTime - startTime;
  return duration >= FALL_DETECTION_THRESHOLDS.MIN_EVENT_DURATION;
}

export function withinTimeWindow(firstEventTime, secondEventTime) {
  const timeDiff = Math.abs(secondEventTime - firstEventTime);
  return timeDiff <= FALL_DETECTION_THRESHOLDS.MAX_TIME_BETWEEN_PHASES;
}

export function calculateRateOfChange(value1, value2, timeDiff) {
  if (timeDiff === 0) return 0;
  return (value2 - value1) / timeDiff;
}

