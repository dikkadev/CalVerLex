#!/bin/bash

# Local testing script for CalVerLex GitHub Action
# Tests the action locally using environment variables

set -e

echo "🧪 CalVerLex Local Testing Script"
echo "================================="

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test counter
TESTS_RUN=0
TESTS_PASSED=0
TESTS_FAILED=0

# Function to run a test
run_test() {
    local test_name="$1"
    shift
    local -A env_vars
    
    echo -e "\n${YELLOW}🧪 Test: ${test_name}${NC}"
    
    TESTS_RUN=$((TESTS_RUN + 1))
    
    # Parse environment variables
    while [[ $# -gt 0 ]]; do
        if [[ $1 =~ ^([^=]+)=(.*)$ ]]; then
            env_vars[${BASH_REMATCH[1]}]="${BASH_REMATCH[2]}"
        fi
        shift
    done
    
    # Set default values
    export INPUT_GITHUB_TOKEN="${env_vars[GITHUB_TOKEN]:-fake_token_for_testing}"
    export INPUT_REPOSITORY="${env_vars[REPOSITORY]:-test/repo}"
    export INPUT_YEAR_FORMAT="${env_vars[YEAR_FORMAT]:-2}"
    export INPUT_CURRENT_VERSION="${env_vars[CURRENT_VERSION]:-}"
    
    # Run the action
    echo "Running: node src/index.js"
    if output=$(node src/index.js 2>&1); then
        echo -e "${GREEN}✅ Test passed${NC}"
        echo "Output: $output"
        TESTS_PASSED=$((TESTS_PASSED + 1))
        return 0
    else
        echo -e "${RED}❌ Test failed${NC}"
        echo "Error: $output"
        TESTS_FAILED=$((TESTS_FAILED + 1))
        return 1
    fi
}

echo -e "\n${YELLOW}Setting up test environment...${NC}"

# Make sure we're in the right directory
if [ ! -f "src/index.js" ]; then
    echo -e "${RED}❌ Error: src/index.js not found. Please run from project root.${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Environment ready${NC}"

# Test 1: Basic functionality with defaults
run_test "Basic functionality with defaults"

# Test 2: With 4-digit year format
run_test "4-digit year format" \
    "YEAR_FORMAT=4"

# Test 3: With current version override
run_test "Current version override" \
    "CURRENT_VERSION=25001a"

# Test 4: Invalid current version (should fail)
echo -e "\n${YELLOW}🧪 Test: Invalid current version (should fail)${NC}"
TESTS_RUN=$((TESTS_RUN + 1))

export INPUT_GITHUB_TOKEN="fake_token_for_testing"
export INPUT_REPOSITORY="test/repo"
export INPUT_YEAR_FORMAT="2"
export INPUT_CURRENT_VERSION="invalid_format"

if output=$(node src/index.js 2>&1); then
    echo -e "${RED}❌ Test failed - should have failed with invalid current_version${NC}"
    echo "Output: $output"
    TESTS_FAILED=$((TESTS_FAILED + 1))
else
    echo -e "${GREEN}✅ Test passed - correctly failed with invalid input${NC}"
    echo "Error (expected): $output"
    TESTS_PASSED=$((TESTS_PASSED + 1))
fi

# Test 5: Different repository format
run_test "Different repository format" \
    "REPOSITORY=owner/different-repo"

# Summary
echo -e "\n${YELLOW}📊 Test Results Summary${NC}"
echo "======================="
echo "Tests run: $TESTS_RUN"
echo -e "Tests passed: ${GREEN}$TESTS_PASSED${NC}"
echo -e "Tests failed: ${RED}$TESTS_FAILED${NC}"

if [ $TESTS_FAILED -eq 0 ]; then
    echo -e "\n${GREEN}🎉 All tests passed!${NC}"
    exit 0
else
    echo -e "\n${RED}💥 Some tests failed!${NC}"
    exit 1
fi 