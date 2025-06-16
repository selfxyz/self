# Scripts Directory

This directory contains utility scripts for the Self contracts project.

## Available Scripts

### Test Scripts (`test.sh`)

Run various types of tests for the contracts.

```bash
# Show all available test commands
./scripts/test.sh help

# Run V2 verification flow tests
./scripts/test.sh v2

# Run all contract tests
./scripts/test.sh all

# Run unit tests
./scripts/test.sh unit

# Run integration tests
./scripts/test.sh integration

# Run test coverage
./scripts/test.sh coverage

# Run specific test types
./scripts/test.sh airdrop
./scripts/test.sh attribute
./scripts/test.sh formatter
./scripts/test.sh hub
./scripts/test.sh registry
./scripts/test.sh sdk

# Clean test artifacts
./scripts/test.sh clean
```

### Development Scripts (`dev.sh`)

Development and deployment utilities.

```bash
# Show all available development commands
./scripts/dev.sh help

# Start local Hardhat node
./scripts/dev.sh node

# Compile contracts
./scripts/dev.sh build

# Clean build artifacts
./scripts/dev.sh clean

# Check contract sizes
./scripts/dev.sh size

# Deploy contracts
./scripts/dev.sh deploy
./scripts/dev.sh deploy:hub
./scripts/dev.sh deploy:hub:v2
./scripts/dev.sh deploy:registry

# Open Hardhat console
./scripts/dev.sh console
```

## Usage Examples

### Quick Test Workflow

```bash
# Navigate to contracts directory
cd contracts

# Run V2 tests
./scripts/test.sh v2

# If tests fail, check build
./scripts/dev.sh build

# Run coverage to see test completeness
./scripts/test.sh coverage
```

### Development Workflow

```bash
# Start local development node (in terminal 1)
./scripts/dev.sh node

# In another terminal, deploy contracts
./scripts/dev.sh deploy:hub:v2

# Run tests against local node
./scripts/test.sh integration
```

## Script Features

- **Colored Output**: Scripts provide colored status messages for better readability
- **Error Handling**: Scripts will exit on errors and provide meaningful error messages
- **Path Detection**: Scripts automatically detect if you're running from `contracts/` or `contracts/scripts/`
- **Environment Variables**: Test scripts automatically set appropriate environment variables

## Running from Different Directories

The scripts are smart about directory detection:

```bash
# From contracts directory
./scripts/test.sh v2

# From contracts/scripts directory
./test.sh v2

# Both will work correctly
```

## Troubleshooting

### Script Permission Issues

If you get permission denied errors:

```bash
chmod +x scripts/test.sh scripts/dev.sh
```

### "hardhat.config.ts not found" Error

This means the script couldn't find the Hardhat configuration. Make sure you're running from:

- The `contracts/` directory, or
- The `contracts/scripts/` directory

### Yarn 4 Workspace Issues

If you encounter Yarn workspace issues, these scripts are designed to work directly with `npx hardhat` to avoid the
workspace complexities.

## Integration with Package.json

The scripts complement the existing `package.json` scripts:

- Package.json scripts: Can be run from anywhere using `yarn` commands
- Shell scripts: Run directly from contracts directory, providing more control and better output

Choose the approach that works best for your workflow!
