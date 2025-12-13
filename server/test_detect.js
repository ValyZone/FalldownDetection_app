import detectFall from './src/fall-detection/index.js';

const testFile = 'test-cases/normalized_chunks/fall/Fall in a curve/Fall in a curve-chunk-001.csv';
console.log(`Testing: ${testFile}\n`);

const result = detectFall(testFile);
console.log(`\nResult: ${result}`);
