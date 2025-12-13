import detectFall from './src/fall-detection/index.js';

const testFile = 'test-cases/normalized_chunks/fall/Fall in a curve/Fall in a curve-chunk-001.csv';

console.log('\n' + '='.repeat(80));
console.log('TESTING: Fall in a curve - chunk 001');
console.log('Expected: Fall detected');
console.log('='.repeat(80) + '\n');

const result = detectFall(testFile);

console.log('\n' + '='.repeat(80));
console.log('FINAL RESULT:', result ? '✓ FALL DETECTED' : '✗ NO FALL');
console.log('='.repeat(80) + '\n');
