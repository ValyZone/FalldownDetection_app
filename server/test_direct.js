import detectFall from './src/fall-detection/index.js';

const testFile = 'test-cases/normalized_chunks/fall/Fall in a curve/Fall in a curve-chunk-001.csv';

console.log('\n========== TESTING CHUNK-001 ==========');
console.log('File:', testFile);
console.log('Expected: Fall detected');
console.log('========================================\n');

const result = detectFall(testFile);

console.log('\n========== RESULT ==========');
console.log('Fall Detected:', result);
console.log('============================\n');
