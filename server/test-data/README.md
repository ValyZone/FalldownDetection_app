# Test Data Files for Fall Detection

This directory contains test CSV files for validating the motorcycle fall detection algorithm. Each file simulates different scenarios to test the three-phase detection system.

## Motorcycle-Specific Test Scenarios

### 1. `motorcycle-crash-with-tumbling.csv`
**Purpose:** Test the complete three-phase fall detection sequence in a motorcycle crash scenario.

**Scenario:** A motorcycle crash where the rider and phone experience all three phases:
- **Phase 1 (0.8-1.6s):** Sudden deceleration as the motorcycle crashes
  - Peak deceleration: ~-22.5 m/s² on X-axis
- **Phase 2 (1.6-2.4s):** Free-fall as the phone/rider tumble through the air
  - Minimum acceleration: ~0.7-1.2 m/s² (near weightlessness)
- **Phase 3 (2.4-2.7s):** Ground impact with high force
  - Peak impact: ~40.95 m/s² (~4.2g)

**Expected Result:** ✅ Fall detected with all three phases validated

---

### 2. `controlled-drop-stationary.csv`
**Purpose:** Test fall detection when the phone falls while the motorcycle is stationary.

**Scenario:** Phone drops from a parked motorcycle:
- **Phase 1:** No significant deceleration (motorcycle is stationary)
- **Phase 2 (1.0-2.0s):** Free-fall period
  - Minimum acceleration: ~0.81-1.21 m/s²
- **Phase 3 (2.0-2.3s):** Impact with ground
  - Peak impact: ~45.38 m/s² (~4.6g)

**Expected Result:** ❌ Fall NOT detected (missing Phase 1 - deceleration)
- This is correct behavior as it's just a phone drop, not a motorcycle crash
- Could be detected if Phase 1 requirement is made optional

---

### 3. `hard-braking-no-fall.csv`
**Purpose:** Test false-positive prevention during hard braking without a fall.

**Scenario:** Emergency braking maneuver:
- **Phase 1 (1.0-1.8s):** Strong deceleration
  - Peak deceleration: ~-19.2 m/s² on X-axis
- **Phase 2:** ❌ No free-fall (acceleration remains normal ~9.8 m/s²)
- **Phase 3:** ❌ No ground impact

**Expected Result:** ❌ Fall NOT detected
- Deceleration alone is not sufficient
- Algorithm correctly requires all three phases

---

### 4. `road-bump-false-positive.csv`
**Purpose:** Test false-positive prevention when riding over road bumps.

**Scenario:** Motorcycle hits a pothole or road bump:
- **Phase 1:** ❌ No deceleration (speed maintained)
- **Phase 2:** ❌ No free-fall (brief spike but not sustained)
- **Phase 3:** Acceleration spike (1.0-1.5s) but below impact threshold
  - Peak: ~29.92 m/s² (~3.0g) - below 25 m/s² threshold

**Expected Result:** ❌ Fall NOT detected
- Impact spike is below threshold
- Missing deceleration and free-fall phases
- Algorithm correctly filters this as normal riding

---

### 5. `normal-riding-patterns.csv`
**Purpose:** Test algorithm behavior during normal motorcycle riding.

**Scenario:** Normal riding with typical vibrations and minor variations:
- Small fluctuations in all axes (±1 m/s²)
- Acceleration remains close to gravity (~9.8 m/s²)
- No deceleration, free-fall, or impact events

**Expected Result:** ❌ Fall NOT detected
- No phase thresholds are exceeded
- Confirms algorithm doesn't trigger on normal riding

---

## Legacy Test Files

### `fall-detected-clear.csv`
Original test file for simple fall detection (old algorithm).

### `fall-and-recovery.csv`
Original test file showing fall with recovery pattern (old algorithm).

### `no-fall-walking.csv`
Original test file for walking movement (old algorithm).

---

## Running Tests

### Manual Testing
Use the manual test script to analyze individual files:

```bash
node manual-test.js test-data/motorcycle-crash-with-tumbling.csv
```

### Automated Testing
Run all tests at once:

```bash
node test-runner.js
```

---

## Algorithm Thresholds

The three-phase detection algorithm uses these research-based thresholds:

| Phase | Threshold | Physical Meaning |
|-------|-----------|------------------|
| Deceleration | < -15 m/s² | ~-1.53g sudden speed loss |
| Free-fall | < 2.0 m/s² | ~0.2g (near weightlessness) |
| Impact | > 25 m/s² | ~2.55g ground impact force |
| Time Window | < 2.0 seconds | Maximum time between phases |
| Min Duration | > 0.2 seconds | Minimum event duration (200ms) |

---

## Expected Test Results Summary

| Test File | Decel | Freefall | Impact | Fall Detected? |
|-----------|-------|----------|--------|----------------|
| motorcycle-crash-with-tumbling.csv | ✅ | ✅ | ✅ | **✅ YES** |
| controlled-drop-stationary.csv | ❌ | ✅ | ✅ | ❌ No |
| hard-braking-no-fall.csv | ✅ | ❌ | ❌ | ❌ No |
| road-bump-false-positive.csv | ❌ | ❌ | ❌ | ❌ No |
| normal-riding-patterns.csv | ❌ | ❌ | ❌ | ❌ No |

---

## Notes

- All test files use the standard CSV format: `Time (s), Acceleration x/y/z (m/s^2), Absolute acceleration (m/s^2)`
- Test data is synthetic but based on realistic acceleration patterns
- For real-world testing, collect actual accelerometer data from motorcycle rides
- Thresholds may need tuning based on field testing results
