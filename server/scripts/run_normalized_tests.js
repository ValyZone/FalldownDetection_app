import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SERVER_URL = process.env.FALL_SERVER_URL ?? 'http://localhost:3030';
const NORMALIZED_ROOT = path.join(__dirname, '..', 'test-cases', 'normalized');
const CHUNK_ROOT = path.join(__dirname, '..', 'test-cases', 'normalized_chunks');
const MAX_LINES_PER_REQUEST = 1200; // header + up to 1199 samples per HTTP call
const IMPACT_THRESHOLD = 14.22; // m/s² (1.45g) - same as in constants.js

// Expectations based on directory structure
const fallExpectations = {
  'fall': true,      // test-cases/fall/** should detect falls
  'no_fall': false,  // test-cases/no_fall/** should NOT detect falls
};

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  bright: '\x1b[1m',
};

async function ensureChunkDir(dirPath) {
  await fs.mkdir(dirPath, { recursive: true });
  const entries = await fs.readdir(dirPath, { withFileTypes: true }).catch(() => []);
  await Promise.all(entries.filter(e => e.isFile()).map(e => fs.unlink(path.join(dirPath, e.name))));
}

function getChunkPeakAcceleration(chunkLines) {
  // Skip header, find max absolute acceleration (column 5)
  let maxAccel = 0;
  for (let i = 1; i < chunkLines.length; i++) {
    const values = chunkLines[i].split('\t');
    const absAccel = parseFloat(values[4]); // Absolute acceleration column
    if (!isNaN(absAccel) && absAccel > maxAccel) {
      maxAccel = absAccel;
    }
  }
  return maxAccel;
}

async function chunkFileIfNeeded(filePath, relativeDir, expectFall) {
  const raw = await fs.readFile(filePath, 'utf-8');
  const lines = raw.split(/\r?\n/).filter(line => line.trim().length > 0);

  if (lines.length <= MAX_LINES_PER_REQUEST) {
    return [filePath];
  }

  const header = lines[0];
  const data = lines.slice(1);
  const chunkDir = path.join(CHUNK_ROOT, relativeDir);
  await ensureChunkDir(chunkDir);

  const chunkPaths = [];
  let skippedChunks = 0;
  
  for (let index = 0; index < data.length; index += (MAX_LINES_PER_REQUEST - 1)) {
    const chunkData = data.slice(index, index + (MAX_LINES_PER_REQUEST - 1));
    const chunkLines = [header, ...chunkData];
    
    // For fall scenarios, only keep chunks with peaks above threshold
    if (expectFall) {
      const peakAccel = getChunkPeakAcceleration(chunkLines);
      if (peakAccel < IMPACT_THRESHOLD) {
        skippedChunks++;
        continue; // Skip this chunk - no significant impact
      }
    }
    
    const chunkName = `${path.basename(filePath, '.csv')}-chunk-${String(chunkPaths.length + 1).padStart(3, '0')}.csv`;
    const chunkPath = path.join(chunkDir, chunkName);
    const payload = chunkLines.join('\n');
    await fs.writeFile(chunkPath, payload, 'utf-8');
    chunkPaths.push(chunkPath);
  }

  if (skippedChunks > 0) {
    console.log(`  ${colors.cyan}Filtered ${skippedChunks} chunks without significant impact (keeping ${chunkPaths.length})${colors.reset}`);
  }

  return chunkPaths;
}

async function gatherNormalizedFiles() {
  const categories = await fs.readdir(NORMALIZED_ROOT, { withFileTypes: true });
  const testCases = [];

  for (const category of categories) {
    if (!category.isDirectory()) continue;
    
    const categoryPath = path.join(NORMALIZED_ROOT, category.name);
    const expectedFall = fallExpectations[category.name] ?? false;
    
    const scenarios = await fs.readdir(categoryPath, { withFileTypes: true });
    
    for (const scenario of scenarios) {
      if (!scenario.isDirectory()) continue;
      const scenarioDir = path.join(categoryPath, scenario.name);
      const files = await fs.readdir(scenarioDir, { withFileTypes: true });

      for (const file of files) {
        if (!file.isFile() || !file.name.endsWith('.csv')) continue;
        const filePath = path.join(scenarioDir, file.name);
        const relDir = path.join(category.name, scenario.name);
        const targets = await chunkFileIfNeeded(filePath, relDir, expectedFall);
        for (const targetPath of targets) {
          testCases.push({
            category: category.name,
            scenario: scenario.name,
            path: targetPath,
            original: filePath,
            expectedFall,
          });
        }
      }
    }
  }

  return testCases;
}

async function checkServer() {
  try {
    const response = await fetch(`${SERVER_URL}/health`);
    if (!response.ok) return false;
    return true;
  } catch {
    return false;
  }
}

async function runSingleTest(testCase, index, total) {
  const csvContent = await fs.readFile(testCase.path, 'utf-8');
  const response = await fetch(`${SERVER_URL}/fall-detection/receive-data`, {
    method: 'POST',
    headers: { 'Content-Type': 'text/csv' },
    body: csvContent,
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  const payload = await response.json();
  const expected = testCase.expectedFall;
  const actual = Boolean(payload.fallDetected ?? payload.isFall);
  const passed = actual === expected;

  const label = `${testCase.category}/${testCase.scenario} (${path.basename(testCase.path)})`;
  if (passed) {
    console.log(`${colors.green}${index + 1}/${total} ✓ ${label}${colors.reset}`);
  } else {
    console.log(`${colors.red}${index + 1}/${total} ✗ ${label}${colors.reset}`);
    console.log(`  Expected: ${expected ? 'Fall' : 'No Fall'}`);
    console.log(`  Actual: ${actual ? 'Fall' : 'No Fall'}`);
    console.log(`  Reason: ${payload.reason ?? 'n/a'}`);
  }

  return { label, expected, actual, passed, response: payload };
}

async function main() {
  console.log(`${colors.bright}${colors.cyan}Running normalized dataset tests${colors.reset}`);

  await fs.mkdir(CHUNK_ROOT, { recursive: true });
  const tests = await gatherNormalizedFiles();

  if (tests.length === 0) {
    console.log(`${colors.yellow}No normalized CSV files found.${colors.reset}`);
    return;
  }

  if (!(await checkServer())) {
    console.error(`${colors.red}Server not reachable at ${SERVER_URL}. Start it with npm start.${colors.reset}`);
    process.exit(1);
  }

  const results = [];
  for (let i = 0; i < tests.length; i++) {
    try {
      const outcome = await runSingleTest(tests[i], i, tests.length);
      results.push(outcome);
    } catch (error) {
      console.log(`${colors.red}${i + 1}/${tests.length} ⚠ Error: ${error.message}${colors.reset}`);
      results.push({ label: tests[i].scenario, error: error.message, passed: false });
    }
  }

  const passed = results.filter(r => r.passed).length;
  console.log(`\n${colors.bright}Summary:${colors.reset}`);
  console.log(`  Total: ${results.length}`);
  console.log(`  Passed: ${colors.green}${passed}${colors.reset}`);
  console.log(`  Failed: ${colors.red}${results.length - passed}${colors.reset}`);

  const failed = results.filter(r => !r.passed);
  if (failed.length > 0) {
    console.log(`\n${colors.red}Failed Cases:${colors.reset}`);
    for (const entry of failed) {
      console.log(`  - ${entry.label ?? entry.error}`);
    }
  }

  process.exit(failed.length > 0 ? 1 : 0);
}

main().catch((error) => {
  console.error(`${colors.red}Fatal error:${colors.reset} ${error.stack ?? error.message}`);
  process.exit(1);
});
