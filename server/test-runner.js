import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

const SERVER_URL = 'http://localhost:3030';
const TEST_DATA_DIR = path.join(__dirname, 'test-data');

const results = {
  total: 0,
  passed: 0,
  failed: 0,
  tests: [],
};

async function sendCsvData(csvContent, testName) {
  const response = await fetch(`${SERVER_URL}/fall-detection/receive-data`, {
    method: 'POST',
    headers: {
      'Content-Type': 'text/csv',
    },
    body: csvContent,
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  return await response.json();
}

async function readTestFile(filename) {
  const filePath = path.join(TEST_DATA_DIR, filename);
  return await fs.readFile(filePath, 'utf-8');
}

async function runTest(testName, filename, expectedFall) {
  results.total++;

  try {
    console.log(`\n${colors.cyan}▶ Running:${colors.reset} ${testName}`);
    console.log(`  File: ${filename}`);
    console.log(`  Expected: ${expectedFall ? 'Fall Detected' : 'No Fall'}`);

    const csvData = await readTestFile(filename);
    const response = await sendCsvData(csvData, testName);
    const actualFall = response.fallDetected;
    const passed = actualFall === expectedFall;

    const result = {
      name: testName,
      filename,
      expected: expectedFall,
      actual: actualFall,
      passed,
      response,
    };

    results.tests.push(result);

    if (passed) {
      results.passed++;
      console.log(`${colors.green}✓ PASSED${colors.reset}`);
      console.log(`  Result: ${actualFall ? 'Fall Detected' : 'No Fall'}`);
    } else {
      results.failed++;
      console.log(`${colors.red}✗ FAILED${colors.reset}`);
      console.log(`  Expected: ${expectedFall ? 'Fall' : 'No Fall'}`);
      console.log(`  Got: ${actualFall ? 'Fall' : 'No Fall'}`);
    }

    if (response.filename) {
      console.log(`  Saved as: ${response.filename}`);
    }

    return result;
  } catch (error) {
    results.failed++;
    const result = {
      name: testName,
      filename,
      expected: expectedFall,
      actual: null,
      passed: false,
      error: error.message,
    };

    results.tests.push(result);

    console.log(`${colors.red}✗ ERROR${colors.reset}`);
    console.log(`  ${error.message}`);

    return result;
  }
}

async function checkServer() {
  try {
    const response = await fetch(`${SERVER_URL}/health`);
    if (response.ok) {
      const data = await response.json();
      console.log(`${colors.green}✓${colors.reset} Server is running`);
      console.log(`  Service: ${data.service}`);
      return true;
    }
  } catch (error) {
    console.log(`${colors.red}✗ Server is not running${colors.reset}`);
    console.log(`  Make sure the server is started: npm start`);
    console.log(`  Server URL: ${SERVER_URL}`);
    return false;
  }
  return false;
}

function printSummary() {
  console.log('\n' + '='.repeat(60));
  console.log(`${colors.bright}TEST SUMMARY${colors.reset}`);
  console.log('='.repeat(60));

  console.log(`\nTotal Tests: ${results.total}`);
  console.log(`${colors.green}Passed: ${results.passed}${colors.reset}`);
  console.log(`${colors.red}Failed: ${results.failed}${colors.reset}`);

  const passRate = results.total > 0
    ? ((results.passed / results.total) * 100).toFixed(1)
    : 0;

  console.log(`Pass Rate: ${passRate}%`);

  if (results.failed > 0) {
    console.log(`\n${colors.red}Failed Tests:${colors.reset}`);
    results.tests
      .filter(t => !t.passed)
      .forEach(t => {
        console.log(`  ✗ ${t.name}`);
        if (t.error) {
          console.log(`    Error: ${t.error}`);
        } else {
          console.log(`    Expected: ${t.expected ? 'Fall' : 'No Fall'}`);
          console.log(`    Got: ${t.actual ? 'Fall' : 'No Fall'}`);
        }
      });
  }

  console.log('\n' + '='.repeat(60));

  process.exit(results.failed > 0 ? 1 : 0);
}

async function main() {
  console.log(`${colors.bright}${colors.blue}`);
  console.log('╔════════════════════════════════════════════════════════╗');
  console.log('║        Fall Detection System - Test Runner            ║');
  console.log('╚════════════════════════════════════════════════════════╝');
  console.log(colors.reset);

  console.log('\nChecking server status...');
  const serverRunning = await checkServer();

  if (!serverRunning) {
    console.log(`\n${colors.yellow}⚠ Cannot run tests - server is not running${colors.reset}`);
    process.exit(1);
  }

  console.log('\n' + '='.repeat(60));
  console.log('Running Fall Detection Tests');
  console.log('='.repeat(60));

  await runTest(
    'No Fall - Normal Walking',
    'no-fall-walking.csv',
    false
  );

  await runTest(
    'Fall Detected - Clear Fall Pattern',
    'fall-detected-clear.csv',
    true
  );

  await runTest(
    'Fall and Recovery - Multiple Events',
    'fall-and-recovery.csv',
    true
  );

  printSummary();
}

main().catch((error) => {
  console.error(`\n${colors.red}Fatal Error:${colors.reset}`, error);
  process.exit(1);
});
