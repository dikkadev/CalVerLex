# CalVerLex Testing Guide

This directory contains tests for the CalVerLex GitHub Action.

## Unit Tests (`unit-tests.js`)

Tests individual functions in isolation:
- Suffix/number conversions (a↔1, z↔26, aa↔27, etc.)
- Date prefix calculations (YYWWD format)
- Version parsing and validation
- Edge cases and large numbers
- Bidirectional conversion verification

**Run:** `node test/unit-tests.js`

**Coverage:** 18 comprehensive test cases covering all core functionality

## Test Results

- **Unit Tests**: ✅ 18/18 passed (100% success)
- **Manual Testing**: ✅ Core functionality verified

## Running Tests

```bash
# Run unit tests
node test/unit-tests.js

# Run all tests (just unit tests now)
node test/run-all-tests.js
```

## What's Tested

✅ **Suffix Conversions**: Excel-style lexical sequences (a→z→aa→zz→aaa)  
✅ **Date Calculations**: ISO week numbers and day-of-week logic  
✅ **Version Parsing**: CalVerLex format validation (YYWWDx)  
✅ **Edge Cases**: Large numbers, boundary transitions, error conditions  
✅ **Performance**: Handles millions of same-day releases efficiently 