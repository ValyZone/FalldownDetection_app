import detectFall from './src/fall-detection/index.js';

const testFile = 'test-cases/normalized/no_fall/Harsh breaking On Straight Line/Harsh breaking On Straight Line.csv';

console.log('\n' + '='.repeat(80));
console.log('TESTING: Harsh breaking (should be NO FALL)');
console.log('Expected: NO fall detected');
console.log('='.repeat(80) + '\n');

const result = detectFall(testFile);

console.log('\n' + '='.repeat(80));
console.log('FINAL RESULT:', result ? '✗ FALL DETECTED (FALSE POSITIVE!)' : '✓ NO FALL (CORRECT)');
console.log('='.repeat(80) + '\n');
