import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import detectFall from './src/fall-detection/index.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

console.log('Testing fall detection with mock datasets...\n');

// Test positive fall dataset
console.log('='.repeat(60));
console.log('Testing: mock_crash_positive.csv');
console.log('='.repeat(60));
const positiveFile = join(__dirname, '../FallDetectionResults/script_generated/mock_crash_positive.csv');
const positiveResult = detectFall(positiveFile);
console.log('\n');

// Test false positive dataset
console.log('='.repeat(60));
console.log('Testing: mock_crash_false_positive.csv');
console.log('='.repeat(60));
const falsePositiveFile = join(__dirname, '../FallDetectionResults/script_generated/mock_crash_false_positive.csv');
const falsePositiveResult = detectFall(falsePositiveFile);
console.log('\n');

// Summary
console.log('='.repeat(60));
console.log('SUMMARY');
console.log('='.repeat(60));
console.log(`Positive fall detected: ${positiveResult ? 'YES' : 'NO'}`);
console.log(`False positive fall detected: ${falsePositiveResult ? 'YES' : 'NO'}`);
