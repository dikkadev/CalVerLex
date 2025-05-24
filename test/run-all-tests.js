#!/usr/bin/env node

// CalVerLex Test Runner
// Runs unit tests only

const { spawn } = require('child_process');
const path = require('path');

function runTestFile(file) {
  return new Promise((resolve) => {
    console.log(`\n🏃 Running ${file}...`);
    
    const child = spawn('node', [path.join(__dirname, file)], {
      stdio: 'inherit'
    });

    child.on('close', (code) => {
      resolve({ file, code });
    });

    child.on('error', (error) => {
      console.error(`Failed to run ${file}:`, error);
      resolve({ file, code: 1, error });
    });
  });
}

async function runAllTests() {
  console.log('🧪 CalVerLex Test Suite');
  console.log('========================');

  const testFiles = [
    'unit-tests.js'
  ];

  const results = [];
  let totalPassed = 0;
  let totalFailed = 0;

  for (const file of testFiles) {
    const result = await runTestFile(file);
    results.push(result);
    
    if (result.code === 0) {
      console.log(`✅ ${file} passed`);
      totalPassed++;
    } else {
      console.log(`❌ ${file} failed (exit code: ${result.code})`);
      totalFailed++;
    }
  }

  console.log('\n📊 Final Results');
  console.log('=================');
  console.log(`Test files passed: ${totalPassed}`);
  console.log(`Test files failed: ${totalFailed}`);

  if (totalFailed > 0) {
    console.log('\n❌ Some tests failed!');
    process.exit(1);
  } else {
    console.log('\n✅ All tests passed!');
    process.exit(0);
  }
}

runAllTests().catch((error) => {
  console.error('Test runner failed:', error);
  process.exit(1);
}); 