import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';
import { FALL_DETECTION_THRESHOLDS } from './src/fall-detection/constants.js';
import { calculateRateOfChange, meetsMinimumDuration, withinTimeWindow } from './src/fall-detection/utils.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Simplified version of the parseAccelerometerData function
function parseAccelerometerData(filePath) {
  const data = fs.readFileSync(filePath, 'utf-8');
  const rows = data.split('\n');
  rows.shift(); // Skip header

  const dataPoints = [];
  for (const row of rows) {
    if (!row.trim()) continue;
    const values = row.includes('\t') ? row.split('\t') : row.split(',');
    const [timestamp, accelX, accelY, accelZ, absoluteAccel] = values.map(value => parseFloat(value.replace(/"/g, '')));
    if (isNaN(timestamp) || isNaN(accelX) || isNaN(accelY) || isNaN(accelZ)) continue;

    dataPoints.push({
      time: timestamp,
      x: accelX,
      y: accelY,
      z: accelZ,
      absolute: absoluteAccel || Math.sqrt(accelX * accelX + accelY * accelY + accelZ * accelZ),
    });
  }
  return dataPoints;
}

// Simplified detectDecelerationPhase for debugging
function detectDecelerationPhase(dataPoints) {
  const decelerationEvents = [];

  console.log('\nAnalyzing deceleration phase...');
  console.log('Threshold: ', FALL_DETECTION_THRESHOLDS.DECELERATION_THRESHOLD);

  for (let i = 1; i < dataPoints.length && i < 500; i++) {
    const current = dataPoints[i];
    const previous = dataPoints[i - 1];
    const timeDiff = current.time - previous.time;

    if (timeDiff === 0) continue;

    const yRate = calculateRateOfChange(previous.y, current.y, timeDiff);

    // Check around the expected deceleration time (8.0s - 8.3s)
    if (current.time >= 7.9 && current.time <= 8.4 && i % 5 === 0) {
      console.log(`  Time ${current.time.toFixed(2)}s: y=${current.y.toFixed(2)}, rate=${yRate.toFixed(2)} m/s²`);
    }

    if (yRate < FALL_DETECTION_THRESHOLDS.DECELERATION_THRESHOLD) {
      console.log(`  ✓ Deceleration detected at ${current.time.toFixed(2)}s: ${yRate.toFixed(2)} m/s²`);
    }
  }

  return decelerationEvents;
}

console.log('='.repeat(60));
console.log('DETAILED ANALYSIS: mock_crash_positive.csv');
console.log('='.repeat(60));

const positiveFile = join(__dirname, '../FallDetectionResults/script_generated/mock_crash_positive.csv');
const dataPoints = parseAccelerometerData(positiveFile);

console.log(`\nLoaded ${dataPoints.length} data points`);
console.log(`Time range: ${dataPoints[0].time}s - ${dataPoints[dataPoints.length-1].time}s`);

detectDecelerationPhase(dataPoints);
