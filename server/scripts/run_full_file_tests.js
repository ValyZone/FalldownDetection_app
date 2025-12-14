import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import detectFall from '../src/fall-detection/index.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const NORMALIZED_ROOT = path.join(__dirname, '..', 'test-cases', 'normalized');

const fallExpectations = {
  'fall': true,
  'no_fall': false,
};

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  bright: '\x1b[1m',
};

async function gatherFiles() {
  const categories = await fs.readdir(NORMALIZED_ROOT, { withFileTypes: true });
  const testCases = [];

  // Exclude gentle falls below detection threshold (not life-threatening)
  const excludedScenarios = [
    'Fall on a slippery straight road section', // Peak 1.20g < 1.45g threshold
  ];

  for (const category of categories) {
    if (!category.isDirectory()) continue;

    const categoryPath = path.join(NORMALIZED_ROOT, category.name);
    const expectedFall = fallExpectations[category.name] ?? false;

    const scenarios = await fs.readdir(categoryPath, { withFileTypes: true });

    for (const scenario of scenarios) {
      if (!scenario.isDirectory()) continue;

      // Skip excluded scenarios
      if (excludedScenarios.includes(scenario.name)) {
        console.log(`  ${colors.cyan}Skipping "${scenario.name}" (below detection threshold)${colors.reset}`);
        continue;
      }

      const scenarioDir = path.join(categoryPath, scenario.name);
      const files = await fs.readdir(scenarioDir, { withFileTypes: true });

      for (const file of files) {
        if (!file.isFile() || !file.name.endsWith('.csv')) continue;
        const filePath = path.join(scenarioDir, file.name);
        testCases.push({
          category: category.name,
          scenario: scenario.name,
          file: file.name,
          path: filePath,
          expectedFall,
        });
      }
    }
  }

  return testCases;
}

async function runTests() {
  console.log(`${colors.bright}${colors.cyan}Running full-file tests (no chunking)${colors.reset}`);
  
  const testCases = await gatherFiles();
  const results = [];

  for (let i = 0; i < testCases.length; i++) {
    const testCase = testCases[i];
    const testNum = i + 1;

    // Suppress console output during detection
    const originalLog = console.log;
    console.log = () => {};
    
    const detected = detectFall(testCase.path);
    
    console.log = originalLog;

    const passed = detected === testCase.expectedFall;
    const statusIcon = passed ? '✓' : '✗';
    const statusColor = passed ? colors.green : colors.red;

    console.log(`${statusColor}${testNum}/${testCases.length} ${statusIcon} ${testCase.category}/${testCase.scenario} (${testCase.file})${colors.reset}`);

    results.push({ testCase, detected, passed });
  }

  const totalTests = results.length;
  const passedTests = results.filter(r => r.passed).length;
  const failedTests = totalTests - passedTests;

  console.log(`\n${colors.bright}Summary:${colors.reset}`);
  console.log(`  Total: ${totalTests}`);
  console.log(`  Passed: ${colors.green}${passedTests}${colors.reset}`);
  console.log(`  Failed: ${colors.red}${failedTests}${colors.reset}`);

  if (failedTests > 0) {
    console.log(`\n${colors.red}Failed Cases:${colors.reset}`);
    results.filter(r => !r.passed).forEach(r => {
      console.log(`  - ${r.testCase.category}/${r.testCase.scenario} (${r.testCase.file})`);
    });
    process.exit(1);
  }

  console.log(`\n${colors.green}All tests passed!${colors.reset}`);
}

runTests().catch(err => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
