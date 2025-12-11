import detectFall from './src/fall-detection/index.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('\n===========================================');
console.log('Testing Three-Phase Fall Detection Algorithm');
console.log('===========================================\n');

const testFiles = [
  {
    file: 'motorcycle-crash-with-tumbling.csv',
    expected: true,
    description: 'Motorcycle crash with all three phases'
  },
  {
    file: 'controlled-drop-stationary.csv',
    expected: false,
    description: 'Controlled drop (missing deceleration phase)'
  },
  {
    file: 'hard-braking-no-fall.csv',
    expected: false,
    description: 'Hard braking without fall'
  },
  {
    file: 'road-bump-false-positive.csv',
    expected: false,
    description: 'Road bump (should not trigger)'
  },
  {
    file: 'normal-riding-patterns.csv',
    expected: false,
    description: 'Normal riding patterns'
  }
];

let passedTests = 0;
let failedTests = 0;

for (const test of testFiles) {
  const filePath = path.join(__dirname, 'test-data', test.file);
  console.log(`\n📁 Testing: ${test.file}`);
  console.log(`   Description: ${test.description}`);
  console.log(`   Expected: ${test.expected ? 'FALL DETECTED' : 'NO FALL'}`);
  console.log('   ---');

  try {
    const result = detectFall(filePath);
    const passed = result === test.expected;

    if (passed) {
      console.log(`   ✅ PASSED - Got: ${result ? 'FALL DETECTED' : 'NO FALL'}`);
      passedTests++;
    } else {
      console.log(`   ❌ FAILED - Got: ${result ? 'FALL DETECTED' : 'NO FALL'}, Expected: ${test.expected ? 'FALL DETECTED' : 'NO FALL'}`);
      failedTests++;
    }
  } catch (error) {
    console.log(`   ❌ ERROR: ${error.message}`);
    failedTests++;
  }

  console.log('   ---');
}

console.log('\n===========================================');
console.log('Test Summary');
console.log('===========================================');
console.log(`Total Tests: ${testFiles.length}`);
console.log(`Passed: ${passedTests} ✅`);
console.log(`Failed: ${failedTests} ❌`);
console.log(`Success Rate: ${((passedTests / testFiles.length) * 100).toFixed(1)}%`);
console.log('===========================================\n');

process.exit(failedTests > 0 ? 1 : 0);
