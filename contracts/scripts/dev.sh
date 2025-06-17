#!/bin/bash

# Development script for Self contracts
# Usage: ./scripts/dev.sh [command]

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
    echo "Self Contracts Development Tools"
    echo ""
    echo "Usage: ./scripts/dev.sh [command]"
    echo ""
    echo "Commands:"
    echo "  node          Start local Hardhat node"
    echo "  build         Compile contracts"
    echo "  clean         Clean build artifacts"
    echo "  size          Check contract sizes"
    echo "  deploy        Deploy all contracts"
    echo "  deploy:hub    Deploy hub contracts"
    echo "  deploy:hub:v2 Deploy hub V2 contracts"
    echo "  deploy:registry Deploy registry contracts"
    echo "  console       Open Hardhat console"
    echo "  help          Show this help message"
    echo ""
    echo "Examples:"
    echo "  ./scripts/dev.sh node"
    echo "  ./scripts/dev.sh build"
    echo "  ./scripts/dev.sh deploy:hub:v2"
    echo ""
}

# Function to run development commands
run_dev_command() {
    local command=$1

    case $command in
        "node")
            print_status "Starting Hardhat node..."
            npx hardhat node
            ;;
        "build")
            print_status "Compiling contracts..."
            npx hardhat clean
            npx hardhat compile
            print_success "Contracts compiled successfully"
            ;;
        "clean")
            print_status "Cleaning build artifacts..."
            npx hardhat clean
            rm -rf cache/
            rm -rf artifacts/
            rm -rf typechain-types/
            print_success "Build artifacts cleaned"
            ;;
        "size")
            print_status "Checking contract sizes..."
            npx hardhat compile
            npx hardhat size-contracts
            ;;
        "deploy")
            print_status "Deploying all contracts..."
            npm run deploy:all
            print_success "All contracts deployed"
            ;;
        "deploy:hub")
            print_status "Deploying hub contracts..."
            npm run deploy:hub
            print_success "Hub contracts deployed"
            ;;
        "deploy:hub:v2")
            print_status "Deploying hub V2 contracts..."
            npm run deploy:hub:v2
            print_success "Hub V2 contracts deployed"
            ;;
        "deploy:registry")
            print_status "Deploying registry contracts..."
            npm run deploy:registry
            print_success "Registry contracts deployed"
            ;;
        "console")
            print_status "Opening Hardhat console..."
            npx hardhat console
            ;;
        *)
            print_error "Unknown command: $command"
            show_help
            exit 1
            ;;
    esac
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
        "help"|"--help"|"-h")
            show_help
            ;;
        *)
            run_dev_command $1
            ;;
    esac
}

# Run main function with all arguments
main "$@"
