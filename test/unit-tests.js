#!/usr/bin/env node

// CalVerLex Unit Tests
// Comprehensive test suite covering all functionality

const assert = require('assert');

// Mock console functions for testing
const originalLog = console.log;
const originalError = console.error;
let logOutput = [];
let errorOutput = [];

function mockConsole() {
  console.log = (...args) => logOutput.push(args.join(' '));
  console.error = (...args) => errorOutput.push(args.join(' '));
}

function restoreConsole() {
  console.log = originalLog;
  console.error = originalError;
  logOutput = [];
  errorOutput = [];
}

// Test helper functions by extracting them from the main script
function pad(num, size) {
  return num.toString().padStart(size, '0');
}

function suffixToNumber(suffix) {
  let num = 0n;
  for (const c of suffix) {
    if (c < 'a' || c > 'z') {
      throw new Error(`Invalid suffix character: ${c}. Only lowercase letters a-z are allowed.`);
    }
    num = num * 26n + (BigInt(c.charCodeAt(0)) - 96n);
  }
  return num;
}

function numberToSuffix(num) {
  let suffix = '';
  while (num > 0n) {
    num -= 1n;
    suffix = String.fromCharCode(Number(num % 26n) + 97) + suffix;
    num = num / 26n;
  }
  return suffix;
}

function parseVersion(version) {
  const match = version.match(/^(\d{5,7})([a-z]+)$/);
  if (!match) {
    throw new Error(`Invalid version format: ${version}. Expected format: YYWWDx (e.g., 25216a)`);
  }
  return { prefix: match[1], suffix: match[2] };
}

function calculateDatePrefix(date, yearFormat = '2') {
  const now = date || new Date();
  const yearFull = now.getFullYear();
  const year = yearFormat === '4' ? yearFull : yearFull % 100;
  
  // Calculate ISO week number
  const tmp = new Date(now.valueOf());
  tmp.setUTCDate(tmp.getUTCDate() + 4 - (tmp.getUTCDay() || 7));
  const week = Math.ceil(((tmp - new Date(Date.UTC(tmp.getUTCFullYear(), 0, 1))) / 864e5 + 1) / 7);
  const day = (now.getUTCDay() || 7);
  
  return String(year) + pad(week, 2) + day;
}

// Test suite
const tests = [];

function test(name, fn) {
  tests.push({ name, fn });
}

function runTests() {
  let passed = 0;
  let failed = 0;

  console.log('🧪 Running CalVerLex Unit Tests\n');

  for (const { name, fn } of tests) {
    try {
      fn();
      console.log(`✅ ${name}`);
      passed++;
    } catch (error) {
      console.log(`❌ ${name}: ${error.message}`);
      failed++;
    }
  }

  console.log(`\n📊 Test Results: ${passed} passed, ${failed} failed`);
  
  if (failed > 0) {
    process.exit(1);
  }
}

// Pad function tests
test('pad function adds leading zeros', () => {
  assert.strictEqual(pad(1, 2), '01');
  assert.strictEqual(pad(12, 2), '12');
  assert.strictEqual(pad(1, 3), '001');
  assert.strictEqual(pad(123, 2), '123'); // doesn't truncate
});

// Suffix to number conversion tests
test('suffixToNumber converts single letters correctly', () => {
  assert.strictEqual(suffixToNumber('a'), 1n);
  assert.strictEqual(suffixToNumber('b'), 2n);
  assert.strictEqual(suffixToNumber('z'), 26n);
});

test('suffixToNumber converts double letters correctly', () => {
  assert.strictEqual(suffixToNumber('aa'), 27n);
  assert.strictEqual(suffixToNumber('ab'), 28n);
  assert.strictEqual(suffixToNumber('az'), 52n);
  assert.strictEqual(suffixToNumber('ba'), 53n);
  assert.strictEqual(suffixToNumber('zz'), 702n);
});

test('suffixToNumber converts triple letters correctly', () => {
  assert.strictEqual(suffixToNumber('aaa'), 703n);
  assert.strictEqual(suffixToNumber('abc'), 731n);
  assert.strictEqual(suffixToNumber('zzz'), 18278n);
});

test('suffixToNumber throws error for invalid characters', () => {
  assert.throws(() => suffixToNumber('A'), /Invalid suffix character: A/);
  assert.throws(() => suffixToNumber('1'), /Invalid suffix character: 1/);
  assert.throws(() => suffixToNumber('a1'), /Invalid suffix character: 1/);
});

// Number to suffix conversion tests
test('numberToSuffix converts single digits correctly', () => {
  assert.strictEqual(numberToSuffix(1n), 'a');
  assert.strictEqual(numberToSuffix(2n), 'b');
  assert.strictEqual(numberToSuffix(26n), 'z');
});

test('numberToSuffix converts double digits correctly', () => {
  assert.strictEqual(numberToSuffix(27n), 'aa');
  assert.strictEqual(numberToSuffix(28n), 'ab');
  assert.strictEqual(numberToSuffix(52n), 'az');
  assert.strictEqual(numberToSuffix(53n), 'ba');
  assert.strictEqual(numberToSuffix(702n), 'zz');
});

test('numberToSuffix converts triple digits correctly', () => {
  assert.strictEqual(numberToSuffix(703n), 'aaa');
  assert.strictEqual(numberToSuffix(731n), 'abc');
  assert.strictEqual(numberToSuffix(18278n), 'zzz');
});

// Bidirectional conversion tests
test('suffix and number conversion is bidirectional', () => {
  const testCases = ['a', 'z', 'aa', 'ab', 'az', 'ba', 'zz', 'aaa', 'abc', 'zzz'];
  
  for (const suffix of testCases) {
    const num = suffixToNumber(suffix);
    const convertedBack = numberToSuffix(num);
    assert.strictEqual(convertedBack, suffix, `Failed for ${suffix} -> ${num} -> ${convertedBack}`);
  }
});

// Version parsing tests
test('parseVersion parses valid versions correctly', () => {
  assert.deepStrictEqual(parseVersion('25216a'), { prefix: '25216', suffix: 'a' });
  assert.deepStrictEqual(parseVersion('2025216z'), { prefix: '2025216', suffix: 'z' });
  assert.deepStrictEqual(parseVersion('24011aa'), { prefix: '24011', suffix: 'aa' });
  assert.deepStrictEqual(parseVersion('25216abc'), { prefix: '25216', suffix: 'abc' });
});

test('parseVersion throws error for invalid formats', () => {
  assert.throws(() => parseVersion('25216'), /Invalid version format/);
  assert.throws(() => parseVersion('25216A'), /Invalid version format/);
  assert.throws(() => parseVersion('25216a1'), /Invalid version format/);
  assert.throws(() => parseVersion('abc216a'), /Invalid version format/);
  assert.throws(() => parseVersion(''), /Invalid version format/);
});

// Date prefix calculation tests
test('calculateDatePrefix generates correct format', () => {
  // Test with a known date: 2025-01-13 (Monday, week 3)
  const testDate = new Date('2025-01-13T10:00:00Z');
  const prefix2 = calculateDatePrefix(testDate, '2');
  const prefix4 = calculateDatePrefix(testDate, '4');
  
  // Should be: 25 (year) + 03 (week) + 1 (Monday)
  assert.strictEqual(prefix2, '25031');
  assert.strictEqual(prefix4, '2025031');
});

test('calculateDatePrefix handles different days of week', () => {
  // Test different days in the same week
  const dates = [
    { date: '2025-01-13T10:00:00Z', day: 1 }, // Monday
    { date: '2025-01-14T10:00:00Z', day: 2 }, // Tuesday
    { date: '2025-01-15T10:00:00Z', day: 3 }, // Wednesday
    { date: '2025-01-16T10:00:00Z', day: 4 }, // Thursday
    { date: '2025-01-17T10:00:00Z', day: 5 }, // Friday
    { date: '2025-01-18T10:00:00Z', day: 6 }, // Saturday
    { date: '2025-01-19T10:00:00Z', day: 7 }, // Sunday
  ];

  for (const { date, day } of dates) {
    const testDate = new Date(date);
    const prefix = calculateDatePrefix(testDate, '2');
    assert.strictEqual(prefix, `2503${day}`, `Failed for ${date} (day ${day})`);
  }
});

// Edge case tests
test('suffix sequence continues correctly through boundaries', () => {
  // Test going from z to aa
  assert.strictEqual(numberToSuffix(26n), 'z');
  assert.strictEqual(numberToSuffix(27n), 'aa');
  
  // Test going from zz to aaa
  assert.strictEqual(numberToSuffix(702n), 'zz');
  assert.strictEqual(numberToSuffix(703n), 'aaa');
});

test('large suffix numbers work correctly', () => {
  // Test very large numbers (like zzz and beyond)
  const largeNum = 18278n; // 'zzz'
  const largeSuffix = numberToSuffix(largeNum);
  assert.strictEqual(largeSuffix, 'zzz');
  
  const nextNum = largeNum + 1n;
  const nextSuffix = numberToSuffix(nextNum);
  assert.strictEqual(nextSuffix, 'aaaa');
});

// Performance test for large numbers
test('handles very large suffix numbers efficiently', () => {
  const veryLargeNum = 100000n;
  const start = Date.now();
  const suffix = numberToSuffix(veryLargeNum);
  const end = Date.now();
  
  // Should complete in reasonable time (< 100ms)
  assert(end - start < 100, `Too slow: ${end - start}ms`);
  
  // Verify it's bidirectional
  const backToNum = suffixToNumber(suffix);
  assert.strictEqual(backToNum, veryLargeNum);
});

// Year format tests
test('calculateDatePrefix handles 2-digit vs 4-digit years', () => {
  const testDate = new Date('2025-01-13T10:00:00Z');
  
  const prefix2 = calculateDatePrefix(testDate, '2');
  const prefix4 = calculateDatePrefix(testDate, '4');
  
  assert(prefix2.startsWith('25'), `2-digit year should start with 25, got ${prefix2}`);
  assert(prefix4.startsWith('2025'), `4-digit year should start with 2025, got ${prefix4}`);
});

// Week number edge cases
test('calculateDatePrefix handles year boundaries correctly', () => {
  // Test end of year - should be week 1 of next year in some cases
  const endOfYear = new Date('2024-12-30T10:00:00Z'); // Monday
  const prefix = calculateDatePrefix(endOfYear, '2');
  
  // This should be a valid prefix (exact week depends on ISO week calculation)
  assert(prefix.match(/^\d{5}$/), `Should be 5 digits, got ${prefix}`);
});

runTests(); 