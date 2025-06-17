#!/bin/bash

# Test execution script for Self contracts
# Usage: ./scripts/test.sh [test-type]

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to show help
show_help() {
    echo "Self Contracts Test Runner"
    echo ""
    echo "Usage: ./scripts/test.sh [command]"
    echo ""
    echo "Commands:"
    echo "  all                   Run all contract tests"
    echo ""
    echo "V2 Tests (Individual):"
    echo "  v2-disclose-passport  Run V2 passport disclosure tests"
    echo "  v2-disclose-id        Run V2 ID disclosure tests"
    echo "  v2-register-id        Run V2 ID registration tests"
    echo "  v2-register-passport  Run V2 passport registration tests"
    echo "  v2-hub-other          Run V2 hub other functionality tests"
    echo ""
    echo "V2 Tests (Groups):"
    echo "  v2-disclose           Run all V2 disclosure tests"
    echo "  v2-register           Run all V2 registration tests"
    echo "  v2-all                Run all V2 tests"
    echo ""
    echo "Legacy Tests:"
    echo "  unit                  Run unit tests"
    echo "  integration           Run integration tests"
    echo "  coverage              Run test coverage"
    echo "  airdrop               Run airdrop tests"
    echo "  attribute             Run attribute handler tests"
    echo "  formatter             Run formatter tests"
    echo "  hub                   Run hub tests"
    echo "  registry              Run registry tests"
    echo "  sdk                   Run SDK core tests"
    echo ""
    echo "Utilities:"
    echo "  clean                 Clean test artifacts"
    echo "  help                  Show this help message"
    echo ""
    echo "Examples:"
    echo "  ./scripts/test.sh v2-disclose-passport"
    echo "  ./scripts/test.sh v2-register-id"
    echo "  ./scripts/test.sh v2-all"
    echo "  ./scripts/test.sh coverage"
    echo ""
}

# Function to run tests
run_test() {
    local test_type=$1
    print_status "Running $test_type tests..."

    case $test_type in
        "all")
            npx hardhat test
            ;;
        # V2 Individual Tests
        "v2-disclose-passport")
            npx hardhat test test/v2/disclosePassport.test.ts --network localhost
            ;;
        "v2-disclose-id")
            npx hardhat test test/v2/discloseId.test.ts --network localhost
            ;;
        "v2-register-id")
            npx hardhat test test/v2/registerId.test.ts --network localhost
            ;;
        "v2-register-passport")
            npx hardhat test test/v2/registerPassport.test.ts --network localhost
            ;;
        "v2-hub-other")
            npx hardhat test test/v2/hubOther.test.ts --network localhost
            ;;
        # V2 Group Tests
        "v2-disclose")
            npx hardhat test test/v2/disclosePassport.test.ts test/v2/discloseId.test.ts --network localhost
            ;;
        "v2-register")
            npx hardhat test test/v2/registerId.test.ts test/v2/registerPassport.test.ts --network localhost
            ;;
        "v2-all")
            npx hardhat test test/v2/ --network localhost
            ;;
        # Legacy Tests
        "unit")
            TEST_ENV=local npx hardhat test test/unit/*
            ;;
        "integration")
            TEST_ENV=local npx hardhat test test/integration/*
            ;;
        "coverage")
            npx hardhat coverage
            ;;
        "airdrop")
            TEST_ENV=local npx hardhat test test/example/airdrop.test.ts
            ;;
        "attribute")
            TEST_ENV=local npx hardhat test test/unit/CircuitAttributeHandler.test.ts
            ;;
        "formatter")
            TEST_ENV=local npx hardhat test test/unit/formatter.test.ts
            ;;
        "hub")
            TEST_ENV=local npx hardhat test test/unit/IdentityVerificationHub.test.ts
            ;;
        "registry")
            TEST_ENV=local npx hardhat test test/unit/IdentityRegistry.test.ts
            ;;
        "sdk")
            TEST_ENV=local npx hardhat test test/sdk/sdkCore.test.ts --network localhost
            ;;
        *)
            print_error "Unknown test type: $test_type"
            show_help
            exit 1
            ;;
    esac
}

# Function to clean test artifacts
clean_tests() {
    print_status "Cleaning test artifacts..."
    rm -rf cache/
    rm -rf artifacts/
    rm -rf typechain-types/
    rm -rf coverage/
    rm -rf coverage.json
    print_success "Test artifacts cleaned"
}

# Main execution
main() {
    # Change to contracts directory if not already there
    if [[ ! -f "hardhat.config.ts" ]]; then
        if [[ -f "../hardhat.config.ts" ]]; then
            cd ..
        else
            print_error "Cannot find hardhat.config.ts. Please run from contracts directory or contracts/scripts directory."
            exit 1
        fi
    fi

    case ${1:-help} in
        "clean")
            clean_tests
            ;;
        "help"|"--help"|"-h")
            show_help
            ;;
        *)
            run_test $1
            print_success "$1 tests completed"
            ;;
    esac
}

# Run main function with all arguments
main "$@"
