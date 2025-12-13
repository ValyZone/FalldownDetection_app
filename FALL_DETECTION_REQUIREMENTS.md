# Fall Detection Algorithm Requirements

## Detection Criteria Summary

| Alarm Type | Deceleration Phase | Freefall Phase | Impact Phase | Result |
|------------|-------------------|----------------|--------------|---------|
| **Positive Alarm** (Real Fall) | ✓ **REQUIRED**<br>Rate of change < -15 m/s²<br>Duration ≥ 0.2s | ✓ **REQUIRED**<br>Absolute accel < 2.0 m/s²<br>Duration ≥ 0.2s | ✓ **REQUIRED**<br>Absolute accel > 25 m/s²<br>Local peak detected | **FALL DETECTED** |
| **False Positive Alarm** (Non-Fall) | ✗ **MISSING**<br>No sustained deceleration<br>or Duration < 0.2s | ✗ **MISSING**<br>No sustained freefall<br>or Duration < 0.2s | ✓ Present<br>Impact detected<br>(e.g., phone dropped) | **NO FALL DETECTED** |

---

## Three-Phase Fall Detection Algorithm

The algorithm requires **ALL THREE PHASES** to occur **in sequence** within a **2.0 second time window** to detect a fall.

### Phase 1: Deceleration
- **What it detects:** Sudden braking or slowing down (e.g., motorcycle crash, person stumbling)
- **Threshold:** Rate of change of acceleration < -15 m/s²
- **Minimum duration:** 0.2 seconds (200ms)
- **Measured on:** Individual axes (X, Y, or Z)

### Phase 2: Freefall
- **What it detects:** Weightlessness while falling through the air
- **Threshold:** Absolute acceleration < 2.0 m/s² (near-weightless)
- **Minimum duration:** 0.2 seconds (200ms)
- **Measured on:** Magnitude of all axes combined

### Phase 3: Impact
- **What it detects:** Collision with the ground
- **Threshold:** Absolute acceleration > 25 m/s² (approximately 2.5g)
- **Validation:** Must be a local peak (higher than surrounding data points)
- **Measured on:** Magnitude of all axes combined

### Sequence Validation
- All three phases must occur in order: **Deceleration → Freefall → Impact**
- Maximum time between phases: **2.0 seconds**
- Each phase must meet minimum duration: **0.2 seconds** (except impact which is instantaneous)

---

## Legend

### Terms Explained

| Term | Explanation |
|------|-------------|
| **Acceleration** | Rate of change of velocity, measured in m/s² (meters per second squared) |
| **Absolute Acceleration** | Combined magnitude of acceleration across all three axes (X, Y, Z)<br>Formula: √(x² + y² + z²) |
| **Rate of Change** | How quickly acceleration is changing over time (also called "jerk")<br>Formula: (acceleration₂ - acceleration₁) / time_difference |
| **m/s²** | Meters per second squared - unit of acceleration |
| **g** | Gravity constant (9.81 m/s²) - used as reference for impact force |
| **Local Peak** | A value that is higher than its surrounding neighbors<br>Ensures we detect actual impact, not gradual changes |
| **Time Window** | Maximum allowed time between sequential phases (2.0 seconds)<br>Ensures phases are part of the same event |
| **Duration** | How long a condition must persist to be considered valid<br>Filters out momentary sensor noise |

### Phase-Specific Terms

| Term | Phase | Explanation |
|------|-------|-------------|
| **Deceleration Threshold** | Phase 1 | -15 m/s² - negative value indicates slowing down |
| **Freefall Threshold** | Phase 2 | 2.0 m/s² - very low acceleration (near weightlessness)<br>Normal gravity is 9.81 m/s², so < 2.0 means falling |
| **Impact Threshold** | Phase 3 | 25 m/s² - strong sudden force (approximately 2.5× gravity) |

### Example Scenarios

| Scenario | Deceleration | Freefall | Impact | Detection Result | Reason |
|----------|-------------|----------|--------|------------------|---------|
| Motorcycle crash and rider falls | ✓ Yes | ✓ Yes | ✓ Yes | **FALL DETECTED** | All three phases present in sequence |
| Phone dropped from hand | ✗ No | Partial (<0.2s) | ✓ Yes | **NO FALL** | Missing sustained deceleration and freefall |
| Sudden brake (no fall) | ✓ Yes | ✗ No | ✗ No | **NO FALL** | Only deceleration present |
| Bumpy road/pothole | ✗ No | ✗ No | ✓ Yes | **NO FALL** | Only brief impacts, no fall sequence |
| Person sits down hard | Partial | ✗ No | ✓ Yes | **NO FALL** | No proper freefall phase |
| Jumping and landing | Partial | Partial (<0.2s) | ✓ Yes | **NO FALL** | Freefall duration too short |

---

## Mock Dataset Characteristics

### Positive Alarm Dataset (mock_crash_positive.csv)
**Purpose:** Test that the system correctly detects a real fall

**Data characteristics:**
- **Baseline** (0.0s - 8.0s): Normal motion with gravity (~9.8 m/s²)
- **Deceleration** (8.0s - 8.5s): Gradual decrease from 9.8 → -5.0 m/s² (0.5s duration)
  - Rate of change: ~29.6 m/s² (exceeds -15 m/s² threshold)
- **Freefall** (8.5s - 8.8s): Near-zero acceleration (~0.5-1.5 m/s²) (0.3s duration)
  - Well below 2.0 m/s² threshold
- **Impact** (8.8s): Sudden spike to ~45 m/s²
  - Well above 25 m/s² threshold
- **Post-impact** (8.8s+): Calm motion (person lying still)

**Expected Result:** ✓ **FALL DETECTED**

### False Positive Alarm Dataset (mock_crash_false_positive.csv)
**Purpose:** Test that the system correctly rejects non-fall scenarios

**Data characteristics:**
- **Baseline** (0.0s - 8.0s): Normal motion
- **Brief movement** (8.0s - 8.1s): Small acceleration spike (phone picked up)
- **Very short freefall** (8.1s - 8.2s): ~0.1s of low acceleration
  - **Too short** - doesn't meet 0.2s minimum duration
- **Impact** (8.2s): Strong impact (~45 m/s²) from phone hitting ground
  - Impact present but **missing proper fall sequence**
- **Post-impact** (8.2s+): Calm motion (phone on ground)

**Expected Result:** ✓ **NO FALL DETECTED** (missing deceleration and sustained freefall)

---

## Algorithm Validation Logic

```
IF (deceleration_detected AND
    freefall_detected AND
    impact_detected AND
    phases_occur_in_sequence AND
    time_between_phases <= 2.0s)
THEN
    FALL DETECTED ✓
ELSE
    NO FALL DETECTED ✗
END
```

---

## Configuration Constants

Located in: `server/src/fall-detection/constants.js`

```javascript
FALL_DETECTION_THRESHOLDS = {
  DECELERATION_THRESHOLD: -15.0,        // m/s²
  FREEFALL_THRESHOLD: 2.0,              // m/s²
  IMPACT_THRESHOLD: 25.0,               // m/s²
  MAX_TIME_BETWEEN_PHASES: 2.0,         // seconds
  MIN_EVENT_DURATION: 0.2,              // seconds (200ms)
}
```

---

## Testing the System

### Using the Mobile App Buttons

1. **"Positive Alarm" Button**
   - Fetches `mock_crash_positive.csv` from server
   - Sends data to fall detection endpoint
   - **Expected:** Server detects fall and triggers Discord alert

2. **"False Positive Alarm" Button**
   - Fetches `mock_crash_false_positive.csv` from server
   - Sends data to fall detection endpoint
   - **Expected:** Server does NOT detect fall (no alert)

### Server Endpoints

- **Health Check:** `GET /health`
- **Mock Data (Positive):** `GET /mock-data/positive`
- **Mock Data (False Positive):** `GET /mock-data/false-positive`
- **Fall Detection:** `POST /fall-detection/analyze`

---

## Troubleshooting

| Issue | Possible Cause | Solution |
|-------|---------------|----------|
| Both datasets detect falls | False positive has full 3-phase sequence | Regenerate mock data: `python scripts/generate_mock_datasets.py` |
| Neither dataset detects falls | Deceleration phase too abrupt or thresholds not met | Check generated CSV files match requirements above |
| Positive detects, False positive also detects | Algorithm working correctly if false positive has all 3 phases | Ensure false positive dataset is properly generated |
| Random false positives in real data | Sensor noise or bumpy conditions | Adjust thresholds in `constants.js` or add filtering |

---

*Last Updated: 2025-12-13*
*Algorithm Version: Three-Phase Motorcycle Fall Detection v2.0*
