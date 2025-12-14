import fs from 'fs';
import path from 'path';
import { sendMessage } from '../discord/bot.js';
import {
  FALL_DETECTION_THRESHOLDS,
  EVENT_TYPES,
  AXES
} from './constants.js';
import {
  calculateRollingStats,
  detectPeak,
  detectValley,
  meetsMinimumDuration,
  withinTimeWindow,
  calculateRateOfChange,
} from './utils.js';

/**
 * Formats a timestamp as [minutes:seconds:milliseconds]
 * @param {Date} date - The date object to format
 * @returns {string} - Formatted timestamp
 */
function formatTimestamp(date) {
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    const milliseconds = String(date.getMilliseconds()).padStart(3, '0');
    return `[${minutes}-${seconds}-${milliseconds}]`;
}

/**
 * Parse CSV data and extract accelerometer readings
 * @param {string} filePath - Path to the CSV file
 * @returns {Array<{time: number, x: number, y: number, z: number, absolute: number}>}
 */
function parseAccelerometerData(filePath) {
  const data = fs.readFileSync(filePath, 'utf-8');
  const rows = data.split('\n');

  // Skip header row
  rows.shift();

  const dataPoints = [];

  for (const row of rows) {
    if (!row.trim()) continue;

    // Handle both comma and tab separated values
    const values = row.includes('\t') ? row.split('\t') : row.split(',');
    const [timestamp, accelX, accelY, accelZ, absoluteAccel] = values.map(value => parseFloat(value.replace(/"/g, '')));

    // Skip if we get NaN values
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

/**
 * Detect Phase 1: Sudden Deceleration
 * Detects when the motorcycle suddenly loses speed (negative acceleration spike)
 * @param {Array} dataPoints - Accelerometer data points
 * @returns {Array<{startTime: number, endTime: number, peakValue: number, duration: number, axis: string}>}
 */
function detectDecelerationPhase(dataPoints) {
  const decelerationEvents = [];
  let inDeceleration = false;
  let decelerationStart = null;
  let peakDeceleration = 0;
  let peakAxis = null;

  for (let i = 1; i < dataPoints.length; i++) {
    const current = dataPoints[i];
    const previous = dataPoints[i - 1];
    const timeDiff = current.time - previous.time;

    if (timeDiff === 0) continue;

    // Calculate rate of change (deceleration) for each axis
    const xRate = calculateRateOfChange(previous.x, current.x, timeDiff);
    const yRate = calculateRateOfChange(previous.y, current.y, timeDiff);
    const zRate = calculateRateOfChange(previous.z, current.z, timeDiff);

    // Find the strongest deceleration across all axes
    const rates = [
      { axis: AXES.X, rate: xRate },
      { axis: AXES.Y, rate: yRate },
      { axis: AXES.Z, rate: zRate },
    ];
    const minRate = rates.reduce((min, curr) => curr.rate < min.rate ? curr : min);

    // Check if deceleration threshold is met
    if (minRate.rate < FALL_DETECTION_THRESHOLDS.DECELERATION_THRESHOLD) {
      if (!inDeceleration) {
        inDeceleration = true;
        decelerationStart = current.time;
        peakDeceleration = minRate.rate;
        peakAxis = minRate.axis;
      } else {
        // Update peak if this is stronger
        if (minRate.rate < peakDeceleration) {
          peakDeceleration = minRate.rate;
          peakAxis = minRate.axis;
        }
      }
    } else if (inDeceleration) {
      // End of deceleration event
      const duration = current.time - decelerationStart;

      if (meetsMinimumDuration(decelerationStart, current.time)) {
        decelerationEvents.push({
          startTime: decelerationStart,
          endTime: current.time,
          peakValue: peakDeceleration,
          duration,
          axis: peakAxis,
        });
      }

      inDeceleration = false;
      decelerationStart = null;
      peakDeceleration = 0;
      peakAxis = null;
    }
  }

  // Handle case where deceleration continues to end of data
  if (inDeceleration && decelerationStart !== null) {
    const lastPoint = dataPoints[dataPoints.length - 1];
    const duration = lastPoint.time - decelerationStart;

    if (meetsMinimumDuration(decelerationStart, lastPoint.time)) {
      decelerationEvents.push({
        startTime: decelerationStart,
        endTime: lastPoint.time,
        peakValue: peakDeceleration,
        duration,
        axis: peakAxis,
      });
    }
  }

  return decelerationEvents;
}

/**
 * Detect Phase 2: Free-fall
 * Detects weightlessness when absolute acceleration drops below threshold
 * @param {Array} dataPoints - Accelerometer data points
 * @returns {Array<{startTime: number, endTime: number, minValue: number, duration: number}>}
 */
function detectFreefallPhase(dataPoints) {
  const freefallEvents = [];
  let inFreefall = false;
  let freefallStart = null;
  let minAcceleration = Infinity;

  for (const point of dataPoints) {
    if (point.absolute < FALL_DETECTION_THRESHOLDS.FREEFALL_THRESHOLD) {
      if (!inFreefall) {
        inFreefall = true;
        freefallStart = point.time;
        minAcceleration = point.absolute;
      } else {
        // Update minimum
        if (point.absolute < minAcceleration) {
          minAcceleration = point.absolute;
        }
      }
    } else if (inFreefall) {
      // End of freefall event
      const duration = point.time - freefallStart;

      if (meetsMinimumDuration(freefallStart, point.time)) {
        freefallEvents.push({
          startTime: freefallStart,
          endTime: point.time,
          minValue: minAcceleration,
          duration,
        });
      }

      inFreefall = false;
      freefallStart = null;
      minAcceleration = Infinity;
    }
  }

  // Handle case where freefall continues to end of data
  if (inFreefall && freefallStart !== null) {
    const lastPoint = dataPoints[dataPoints.length - 1];
    const duration = lastPoint.time - freefallStart;

    if (meetsMinimumDuration(freefallStart, lastPoint.time)) {
      freefallEvents.push({
        startTime: freefallStart,
        endTime: lastPoint.time,
        minValue: minAcceleration,
        duration,
      });
    }
  }

  return freefallEvents;
}

/**
 * Detect Phase 3: Ground Impact
 * Detects sudden spike in acceleration when hitting the ground
 * @param {Array} dataPoints - Accelerometer data points
 * @param {boolean} strictMode - If false, don't require local peak detection (for low-speed falls)
 * @returns {Array<{time: number, peakValue: number, x: number, y: number, z: number}>}
 */
function detectImpactPhase(dataPoints, strictMode = true) {
  const impactEvents = [];

  for (let i = 0; i < dataPoints.length; i++) {
    const point = dataPoints[i];

    // Check if absolute acceleration exceeds impact threshold
    if (point.absolute > FALL_DETECTION_THRESHOLDS.IMPACT_THRESHOLD) {
      // In strict mode, verify it's a peak (local maximum)
      // In relaxed mode (for low-speed falls), accept any threshold exceedance
      if (!strictMode || detectPeak(
        dataPoints.map(p => ({ time: p.time, value: p.absolute })),
        i,
        FALL_DETECTION_THRESHOLDS.IMPACT_THRESHOLD,
        2
      )) {
        impactEvents.push({
          time: point.time,
          peakValue: point.absolute,
          x: point.x,
          y: point.y,
          z: point.z,
        });
      }
    }
  }

  return impactEvents;
}

/**
 * Check for stillness after impact (indicates motorcycle at rest after fall)
 * @param {Array} dataPoints - All accelerometer data points
 * @param {number} impactTime - Time of the impact event
 * @returns {boolean} - True if stillness is detected after allowing for sliding
 */
function detectPostImpactStillness(dataPoints, impactTime) {
  const SLIDING_WINDOW = 2.0; // Allow 2 seconds for sliding/tumbling after impact
  const STILLNESS_WINDOW = 1.5; // Then check for 1.5 seconds of stillness
  const STILLNESS_THRESHOLD = 9.5; // ~0.97g - device at odd angle after fall (balanced)
  const STILLNESS_VARIANCE_THRESHOLD = 1.5; // Low variance required (balanced)
  
  // Find data points in the stillness check window (after sliding period)
  const stillnessCheckStart = impactTime + SLIDING_WINDOW;
  const stillnessCheckEnd = stillnessCheckStart + STILLNESS_WINDOW;
  
  const stillnessPoints = dataPoints.filter(p => 
    p.time >= stillnessCheckStart && p.time <= stillnessCheckEnd
  );
  
  if (stillnessPoints.length < 10) {
    // Not enough data points to assess stillness
    console.log(`    Stillness check: Not enough data (${stillnessPoints.length} points after ${stillnessCheckStart.toFixed(2)}s)`);
    return false;
  }
  
  // Check if acceleration values are consistently near gravity (1g = 9.81 m/s²)
  const avgAccel = stillnessPoints.reduce((sum, p) => sum + p.absolute, 0) / stillnessPoints.length;
  
  // Calculate variance to ensure consistent values (not fluctuating)
  const variance = stillnessPoints.reduce((sum, p) => {
    const diff = p.absolute - avgAccel;
    return sum + (diff * diff);
  }, 0) / stillnessPoints.length;
  
  const isStill = avgAccel < STILLNESS_THRESHOLD && variance < STILLNESS_VARIANCE_THRESHOLD;
  
  console.log(`    Stillness check at ${stillnessCheckStart.toFixed(2)}s: avg=${avgAccel.toFixed(2)} m/s², variance=${variance.toFixed(2)}, still=${isStill}`);
  
  return isStill;
}

/**
 * Validate three-phase fall sequence
 * Checks if deceleration → freefall → impact occur in sequence within time windows
 * @param {Array} decelerationEvents
 * @param {Array} freefallEvents
 * @param {Array} impactEvents
 * @returns {Array<{deceleration: object, freefall: object, impact: object, totalDuration: number}>}
 */
function validateFallSequence(decelerationEvents, freefallEvents, impactEvents) {
  const validFalls = [];

  // Check each deceleration event
  for (const decel of decelerationEvents) {
    // Find freefall events that occur after deceleration within time window
    const matchingFreefalls = freefallEvents.filter(ff =>
      ff.startTime >= decel.startTime &&
      withinTimeWindow(decel.endTime, ff.startTime)
    );

    for (const freefall of matchingFreefalls) {
      // Find impact events that occur after freefall within time window
      const matchingImpacts = impactEvents.filter(imp =>
        imp.time >= freefall.startTime &&
        withinTimeWindow(freefall.endTime, imp.time)
      );

      for (const impact of matchingImpacts) {
        // Valid three-phase fall detected!
        const totalDuration = impact.time - decel.startTime;

        validFalls.push({
          deceleration: decel,
          freefall: freefall,
          impact: impact,
          totalDuration,
        });
      }
    }
  }

  return validFalls;
}

/**
 * Main fall detection function implementing three-phase motorcycle fall detection
 * @param {string} filePath - Path to the input CSV file
 * @param {Object} discord - Discord bot instance for sending notifications
 * @returns {boolean} - True if a fall was detected, false otherwise
 */
function detectFall(filePath, discord) {
  try {
    // Parse accelerometer data
    const dataPoints = parseAccelerometerData(filePath);

    if (dataPoints.length === 0) {
      console.log('No valid data points found in file');
      return false;
    }

    // Phase 1: Detect sudden deceleration
    const decelerationEvents = detectDecelerationPhase(dataPoints);
    console.log(`Phase 1: Detected ${decelerationEvents.length} deceleration events`);

    // Phase 2: Detect freefall
    const freefallEvents = detectFreefallPhase(dataPoints);
    console.log(`Phase 2: Detected ${freefallEvents.length} freefall events`);

    // Phase 3: Detect ground impact (strict mode first - requires local peaks)
    const impactEvents = detectImpactPhase(dataPoints, true);
    console.log(`Phase 3: Detected ${impactEvents.length} impact events`);

    // Validate three-phase sequence
    const validFalls = validateFallSequence(decelerationEvents, freefallEvents, impactEvents);
    console.log(`Validated ${validFalls.length} three-phase falls`);
    
    // Simplified fall detection: if no three-phase fall detected, check for impact-only falls
    // This detects low-speed tip-overs that don't have the full crash sequence
    let fallDetected = validFalls.length > 0;
    let detectionMode = 'three-phase';
    
    if (!fallDetected) {
      console.log(`  No three-phase fall detected, trying relaxed mode...`);
      // Try relaxed detection mode - accept any impact above threshold WITH post-impact stillness
      const relaxedImpactEvents = detectImpactPhase(dataPoints, false);
      console.log(`  Relaxed mode: Detected ${relaxedImpactEvents.length} impact events`);
      
      if (relaxedImpactEvents.length > 0) {
        // Filter impacts that have post-impact stillness (indicating motorcycle at rest after fall)
        console.log(`  Checking ${relaxedImpactEvents.length} impacts for post-impact stillness...`);
        const impactsWithStillness = relaxedImpactEvents.filter(impact => {
          console.log(`  Checking impact at ${impact.time.toFixed(2)}s with peak ${impact.peakValue.toFixed(2)} m/s²`);
          return detectPostImpactStillness(dataPoints, impact.time);
        });
        
        console.log(`  Impacts with post-impact stillness: ${impactsWithStillness.length}`);
        
        if (impactsWithStillness.length > 0) {
          fallDetected = true;
          detectionMode = 'impact-only';
          console.log(`  ✓ Simplified detection: Impact-only fall detected (low-speed tip-over)`);
          console.log(`  Max impact: ${Math.max(...impactsWithStillness.map(e => e.peakValue)).toFixed(2)} m/s²`);
        } else {
          console.log(`  ✗ No impacts followed by stillness (likely rough road or aggressive maneuver)`);
        }
      } else {
        console.log(`  ✗ No impacts above threshold (${FALL_DETECTION_THRESHOLDS.IMPACT_THRESHOLD} m/s²)`);
        console.log(`  Data has ${dataPoints.length} points. Sample absolute values:`, 
          dataPoints.slice(0, 5).map(p => p.absolute.toFixed(2)));
      }
    }

    console.log(`Fall Detection Result: ${fallDetected ? 'FALL DETECTED' : 'No fall detected'}`);
    if (validFalls.length > 0) {
      console.log(`  Valid fall sequences found: ${validFalls.length}`);
    }

    // Prepare result object
    const result = {
      fallDetected,
      detectionMode,  // 'three-phase' or 'impact-only'
      algorithm: detectionMode === 'three-phase' ? 'three-phase-motorcycle-detection' : 'impact-only-detection',
      thresholds: {
        deceleration: FALL_DETECTION_THRESHOLDS.DECELERATION_THRESHOLD,
        freefall: FALL_DETECTION_THRESHOLDS.FREEFALL_THRESHOLD,
        impact: FALL_DETECTION_THRESHOLDS.IMPACT_THRESHOLD,
        maxTimeBetweenPhases: FALL_DETECTION_THRESHOLDS.MAX_TIME_BETWEEN_PHASES,
        minEventDuration: FALL_DETECTION_THRESHOLDS.MIN_EVENT_DURATION,
      },
      phases: {
        deceleration: decelerationEvents,
        freefall: freefallEvents,
        impact: impactEvents,
      },
      validFallSequences: validFalls,
      summary: fallDetected && validFalls.length > 0 ? {
        totalFallsDetected: validFalls.length,
        firstFallTime: validFalls[0].deceleration.startTime,
        firstFallDuration: validFalls[0].totalDuration,
        peakImpactForce: validFalls[0].impact.peakValue,
        peakDeceleration: validFalls[0].deceleration.peakValue,
        minFreefallAcceleration: validFalls[0].freefall.minValue,
      } : null,
    };

    // Create output directory
    const outputDir = path.join(process.cwd(), 'FallDetectionResults');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir);
    }

    // Generate timestamp for file naming
    const now = new Date();
    const timestamp = formatTimestamp(now);

    // Save JSON result
    const outputFileName = path.join(outputDir, `${now.toISOString().replace(/[:.]/g, '-')}.json`);
    fs.writeFileSync(outputFileName, JSON.stringify(result, null, 2));

    // Export all accelerometer values to CSV
    const valuesCSV = ['Time (s),Acceleration x (m/s^2),Acceleration y (m/s^2),Acceleration z (m/s^2),Absolute acceleration (m/s^2)'];
    dataPoints.forEach(point => {
      valuesCSV.push(`${point.time},${point.x},${point.y},${point.z},${point.absolute}`);
    });
    const valuesFileName = path.join(outputDir, `${timestamp}-values.csv`);
    fs.writeFileSync(valuesFileName, valuesCSV.join('\n'));

    // Export detailed events to CSV
    const eventsCSV = ['Event Type,Start Time (s),End Time (s),Duration (s),Peak/Min Value,Axis,Additional Data'];

    // Add deceleration events
    decelerationEvents.forEach(event => {
      eventsCSV.push(`${EVENT_TYPES.DECELERATION},${event.startTime},${event.endTime},${event.duration},${event.peakValue},${event.axis},`);
    });

    // Add freefall events
    freefallEvents.forEach(event => {
      eventsCSV.push(`${EVENT_TYPES.FREEFALL},${event.startTime},${event.endTime},${event.duration},${event.minValue},,`);
    });

    // Add impact events
    impactEvents.forEach(event => {
      eventsCSV.push(`${EVENT_TYPES.IMPACT},${event.time},${event.time},0,${event.peakValue},,x=${event.x} y=${event.y} z=${event.z}`);
    });

    // Add validated fall sequences
    validFalls.forEach((fall, index) => {
      eventsCSV.push(`${EVENT_TYPES.FALL_DETECTED},${fall.deceleration.startTime},${fall.impact.time},${fall.totalDuration},${fall.impact.peakValue},,Fall #${index + 1}`);
    });

    const eventsFileName = path.join(outputDir, `${timestamp}-events.csv`);
    fs.writeFileSync(eventsFileName, eventsCSV.join('\n'));

    // Send Discord notification if fall is detected
    if (fallDetected) {
      let message, logDetails;
      
      if (validFalls.length > 0) {
        // Three-phase fall detected
        const firstFall = validFalls[0];
        message = `🚨 **ESÉS ÉRZÉKELVE** 🚨\n\n` +
                      `⏰ ${new Date().toLocaleString('hu-HU')}\n\n` +
                      `⚠️ Még nem érkezett visszajelzés a felhasználótól`;
        
        logDetails = {
          type: 'three-phase',
          deceleration: `${firstFall.deceleration.startTime.toFixed(2)}s → ${(Math.abs(firstFall.deceleration.peakValue) / 9.81).toFixed(1)}g a ${firstFall.deceleration.axis}-tengelyen`,
          freefall: `${firstFall.freefall.startTime.toFixed(2)}s → ${firstFall.freefall.duration.toFixed(2)}s időtartam`,
          impact: `${firstFall.impact.time.toFixed(2)}s → ${(firstFall.impact.peakValue / 9.81).toFixed(1)}g erő`,
          duration: firstFall.totalDuration.toFixed(2)
        };
      } else {
        // Impact-only fall detected (low-speed tip-over)
        const relaxedImpacts = detectImpactPhase(dataPoints, false);
        const maxImpact = relaxedImpacts.reduce((max, curr) => curr.peakValue > max.peakValue ? curr : max, relaxedImpacts[0]);
        
        message = `🚨 **ESÉS ÉRZÉKELVE (Alacsony sebességű)** 🚨\n\n` +
                      `⏰ ${new Date().toLocaleString('hu-HU')}\n\n` +
                      `⚠️ Még nem érkezett visszajelzés a felhasználótól`;
        
        logDetails = {
          type: 'impact-only',
          impact: `${maxImpact.time.toFixed(2)}s → ${(maxImpact.peakValue / 9.81).toFixed(2)}g erő`,
          note: 'Lassú borulás vagy csúszás észlelve'
        };
      }

      // Send Discord notification only if discord instance is provided
      if (discord) {
        sendMessage(discord, message).catch(error => {
          console.error('❌ Discord értesítés küldése sikertelen:', error);
        });
      }

      // Enhanced console output
      console.log('\n' + '═'.repeat(60));
      console.log('🚨 ESÉS ÉRZÉKELVE - DISCORD RIASZTÁS KÜLDÉSE');
      console.log('═'.repeat(60));
      console.log(`⏰ Időpont: ${new Date().toLocaleString('hu-HU')}`);
      console.log(`📍 Helyszín: FallDetectionResults/${path.basename(outputFileName)}`);
      console.log(`\n📊 TÍPUS: ${logDetails.type === 'three-phase' ? 'Háromfázisú esés' : 'Becsapódás-alapú esés'}`);
      
      if (logDetails.type === 'three-phase') {
        console.log(`\n📊 FÁZIS BONTÁS:`);
        console.log(`   1️⃣ Lassulás: ${logDetails.deceleration}`);
        console.log(`   2️⃣ Szabadesés: ${logDetails.freefall}`);
        console.log(`   3️⃣ Becsapódás: ${logDetails.impact}`);
        console.log(`\n⏱️ Teljes időtartam: ${logDetails.duration}s`);
      } else {
        console.log(`\n⚡ BECSAPÓDÁS: ${logDetails.impact}`);
        console.log(`\n💡 ${logDetails.note}`);
      }
      
      console.log(`📨 Discord értesítés elküldve a csatornára`);
      console.log('═'.repeat(60) + '\n');
    }

    return fallDetected;

  } catch (error) {
    console.error(`An error occurred during fall detection: ${error.message}`);
    console.error(error.stack);
    return false;
  }
}

export default detectFall;
