# Fall Detection Testing Guide

This guide explains how to test the fall detection system using the provided test tools and test data.

## Overview

The testing suite includes:
- **Automated Tests** (`test-runner.js`) - Runs all tests automatically and reports results
- **Manual Tests** (`manual-test.js`) - Interactive menu for testing individual scenarios
- **Test Data** (`test-data/`) - CSV files with accelerometer data for different scenarios

## Quick Start

### Prerequisites

1. Make sure the server is running:
   ```bash
   npm start
   ```

2. Server must be accessible at `http://localhost:3030`

### Run Automated Tests

```bash
npm test
```

This will run all test cases and display a summary with pass/fail results.

### Run Manual/Interactive Tests

```bash
npm run test:manual
```

This opens an interactive menu where you can select individual test files to send to the server.

## Test Scenarios

### 1. No Fall - Normal Walking (`no-fall-walking.csv`)

**Description**: Simulates normal walking activity with typical accelerometer variations.

**Data Characteristics**:
- 21 data points over 2 seconds
- Z-axis values remain around 9.8 m/s² (gravity)
- Small variations in X and Y axes (0.65-0.73 m/s²)
- No sudden drops in acceleration

**Expected Result**: ✓ No Fall Detected

**Use Case**: Verify the system doesn't trigger false positives during normal movement.

---

### 2. Fall Detected - Clear Pattern (`fall-detected-clear.csv`)

**Description**: Simulates a clear, textbook fall event with free fall and impact phases.

**Data Characteristics**:
- 26 data points over 2.5 seconds
- **Phase 1 (0.0-0.7s)**: Normal standing/walking (Z ≈ 9.8 m/s²)
- **Phase 2 (0.8-2.2s)**: Free fall - acceleration drops significantly
  - Values decrease from 1.15 to 0.30 m/s²
  - Clear fall pattern detected
- **Phase 3 (2.3-2.5s)**: Recovery - return to normal values (Z ≈ 9.1 m/s²)

**Expected Result**: 🚨 FALL DETECTED

**Use Case**: Verify the system correctly identifies a single, clear fall event.

---

### 3. Fall and Recovery - Multiple Events (`fall-and-recovery.csv`)

**Description**: Simulates multiple fall events with recovery periods between them.

**Data Characteristics**:
- 31 data points over 3 seconds
- **First Fall (0.4-0.9s)**:
  - Drop from 9.95 to 0.32 m/s²
  - Recovery period follows
- **Second Fall (2.0-2.5s)**:
  - Another drop from 9.27 to 0.30 m/s²
  - Recovery at end
- Two distinct recovery phases where values return to normal (~9.2 m/s²)

**Expected Result**: 🚨 FALL DETECTED

**Use Case**: Verify the system can detect falls even when multiple events occur in the same data stream.

## Test Data Format

All test files use CSV format with the following structure:

```csv
"Time (s)","Acceleration x (m/s^2)","Acceleration y (m/s^2)","Acceleration z (m/s^2)","Absolute acceleration (m/s^2)"
0.0,0.65,1.23,9.81,9.95
0.1,0.68,1.20,9.79,9.94
...
```

**Columns**:
- **Time (s)**: Timestamp in seconds
- **Acceleration x/y/z**: Acceleration on each axis in m/s²
- **Absolute acceleration**: Magnitude of total acceleration vector

## Understanding Test Results

### Automated Test Output

```
╔════════════════════════════════════════════════════════╗
║        Fall Detection System - Test Runner            ║
╚════════════════════════════════════════════════════════╝

✓ Server is running

============================================================
Running Fall Detection Tests
============================================================

▶ Running: No Fall - Normal Walking
  File: no-fall-walking.csv
  Expected: No Fall
✓ PASSED
  Result: No Fall

▶ Running: Fall Detected - Clear Fall Pattern
  File: fall-detected-clear.csv
  Expected: Fall Detected
✓ PASSED
  Result: Fall Detected

▶ Running: Fall and Recovery - Multiple Events
  File: fall-and-recovery.csv
  Expected: Fall Detected
✓ PASSED
  Result: Fall Detected

============================================================
TEST SUMMARY
============================================================

Total Tests: 3
Passed: 3
Failed: 0
Pass Rate: 100.0%
============================================================
```

### Exit Codes

- **0**: All tests passed
- **1**: One or more tests failed or server not running

## Creating Custom Test Data

To create your own test scenarios:

1. Create a new CSV file in the `test-data/` directory
2. Use the same format as existing files
3. Include realistic accelerometer values:
   - **Normal activity**: Z-axis ≈ 9.8 m/s², X/Y ≈ 0.5-1.5 m/s²
   - **Free fall**: All axes drop to < 1.0 m/s²
   - **Impact**: Values approach 0.0 m/s²

4. Test manually first:
   ```bash
   npm run test:manual
   ```

5. Add to automated tests by editing `test-runner.js`:
   ```javascript
   await runTest(
     'Your Test Name',
     'your-test-file.csv',
     true  // or false for expected result
   );
   ```

## Fall Detection Algorithm

The server uses a two-phase detection algorithm:

### Phase 1: Identify Dominant Axis
- Analyzes all data points
- Finds axis with least deviation from 9.81 m/s² (gravity)
- This is typically the Z-axis when phone is upright

### Phase 2: Detect Fall Pattern
- Monitors dominant axis values
- **Fall condition**: Absolute value < 0.5 m/s²
- **Impact condition**: Value = 0.0 m/s²
- If either condition is met → Fall Detected

## Troubleshooting

### Server Not Running Error

```
✗ Server is not running
Make sure the server is started: npm start
```

**Solution**: Start the server in a separate terminal:
```bash
npm start
```

### Connection Refused

**Problem**: Tests can't connect to server

**Solutions**:
1. Check server is running on port 3030
2. Verify `SERVER_URL` in test files matches your setup
3. Check firewall settings

### Test Fails Unexpectedly

**Problem**: Test reports failure but you expected different result

**Steps**:
1. Run manual test to see detailed response
2. Check the saved CSV file in `FallDetectionResults/`
3. Verify test data format is correct
4. Review server logs for errors

### No Test Files Found

**Problem**: Manual test shows no CSV files

**Solution**: Ensure test data files are in `test-data/` directory relative to test scripts

## Advanced Usage

### Testing Against Remote Server

Edit the `SERVER_URL` constant in test files:

```javascript
// test-runner.js or manual-test.js
const SERVER_URL = 'http://your-server-ip:3030';
```

### Continuous Integration

Add to your CI pipeline:

```yaml
# Example GitHub Actions
- name: Run Fall Detection Tests
  run: |
    npm start &
    sleep 5  # Wait for server startup
    npm test
```

## Test Coverage

Current test coverage:

| Scenario | Test File | Status |
|----------|-----------|--------|
| Normal Activity | no-fall-walking.csv | ✓ |
| Single Fall Event | fall-detected-clear.csv | ✓ |
| Multiple Falls | fall-and-recovery.csv | ✓ |
| Edge Cases | - | ⏳ To be added |
| Extreme Values | - | ⏳ To be added |

## Next Steps

Consider adding tests for:
- Extreme acceleration values
- Corrupted/malformed CSV data
- Empty data files
- Very long data streams
- Different phone orientations
- Rapid movements that aren't falls
- Gradual position changes
