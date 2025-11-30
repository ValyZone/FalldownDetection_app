import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import readline from 'readline';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Configuration
const SERVER_URL = 'http://localhost:3030';
const TEST_DATA_DIR = path.join(__dirname, 'test-data');

// ANSI colors
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
};

// Create readline interface
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

/**
 * Prompts user for input
 */
function prompt(question) {
  return new Promise((resolve) => {
    rl.question(question, resolve);
  });
}

/**
 * Lists available test files
 */
async function listTestFiles() {
  const files = await fs.readdir(TEST_DATA_DIR);
  const csvFiles = files.filter(f => f.endsWith('.csv'));

  console.log(`\n${colors.cyan}Available Test Files:${colors.reset}`);
  csvFiles.forEach((file, index) => {
    console.log(`  ${index + 1}. ${file}`);
  });
  console.log(`  ${csvFiles.length + 1}. Exit`);

  return csvFiles;
}

/**
 * Sends test data to server
 */
async function sendTestData(filename) {
  console.log(`\n${colors.yellow}Sending test data...${colors.reset}`);

  const filePath = path.join(TEST_DATA_DIR, filename);
  const csvData = await fs.readFile(filePath, 'utf-8');

  const response = await fetch(`${SERVER_URL}/fall-detection/receive-data`, {
    method: 'POST',
    headers: {
      'Content-Type': 'text/csv',
    },
    body: csvData,
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  return await response.json();
}

/**
 * Displays test result
 */
function displayResult(result, filename) {
  console.log('\n' + '='.repeat(60));
  console.log(`${colors.bright}Test Result${colors.reset}`);
  console.log('='.repeat(60));

  console.log(`\nTest File: ${colors.cyan}${filename}${colors.reset}`);

  if (result.fallDetected) {
    console.log(`Result: ${colors.red}${colors.bright}🚨 FALL DETECTED${colors.reset}`);
  } else {
    console.log(`Result: ${colors.green}✓ No Fall Detected${colors.reset}`);
  }

  console.log(`\nServer Response:`);
  console.log(`  Message: ${result.message}`);
  console.log(`  Filename: ${result.filename}`);
  console.log(`  Timestamp: ${result.timestamp}`);
  console.log(`  Data Length: ${result.dataLength} bytes`);

  console.log('\n' + '='.repeat(60));
}

/**
 * Checks server health
 */
async function checkServer() {
  try {
    const response = await fetch(`${SERVER_URL}/health`);
    if (response.ok) {
      return true;
    }
  } catch (error) {
    return false;
  }
  return false;
}

/**
 * Main interactive menu
 */
async function main() {
  console.clear();
  console.log(`${colors.bright}${colors.blue}`);
  console.log('╔════════════════════════════════════════════════════════╗');
  console.log('║     Fall Detection System - Manual Test Tool          ║');
  console.log('╚════════════════════════════════════════════════════════╝');
  console.log(colors.reset);

  // Check server
  console.log('\nChecking server...');
  const serverRunning = await checkServer();

  if (!serverRunning) {
    console.log(`${colors.red}✗ Server is not running!${colors.reset}`);
    console.log('Please start the server with: npm start');
    rl.close();
    return;
  }

  console.log(`${colors.green}✓ Server is running${colors.reset}`);

  // Main loop
  while (true) {
    try {
      const files = await listTestFiles();

      const choice = await prompt(`\n${colors.yellow}Select a test file (1-${files.length + 1}): ${colors.reset}`);
      const index = parseInt(choice) - 1;

      if (index === files.length) {
        console.log(`\n${colors.cyan}Goodbye!${colors.reset}\n`);
        break;
      }

      if (index < 0 || index >= files.length) {
        console.log(`${colors.red}Invalid selection!${colors.reset}`);
        continue;
      }

      const filename = files[index];

      try {
        const result = await sendTestData(filename);
        displayResult(result, filename);

        const another = await prompt(`\n${colors.yellow}Test another file? (y/n): ${colors.reset}`);
        if (another.toLowerCase() !== 'y') {
          console.log(`\n${colors.cyan}Goodbye!${colors.reset}\n`);
          break;
        }

        console.clear();
        console.log(`${colors.bright}${colors.blue}Fall Detection System - Manual Test Tool${colors.reset}\n`);

      } catch (error) {
        console.log(`\n${colors.red}Error:${colors.reset} ${error.message}`);
      }

    } catch (error) {
      console.log(`\n${colors.red}Error:${colors.reset} ${error.message}`);
      break;
    }
  }

  rl.close();
}

// Run
main().catch((error) => {
  console.error(`\n${colors.red}Fatal Error:${colors.reset}`, error);
  rl.close();
  process.exit(1);
});
