# AGENTS Instructions

## Development Workflow

### Code Quality (Recommended)

For the best development experience, run these commands in order:

```bash
# Fix linting and formatting issues automatically
yarn nice

# Check types across the codebase
yarn types

# Run tests to ensure everything works
yarn test
```

### Individual Commands

#### Linting

- Run `yarn lint` to check for linting issues
- Run `yarn lint:fix` to automatically fix linting issues

#### Formatting

- Run `yarn fmt` to check if files are properly formatted
- Run `yarn fmt:fix` to automatically format files with Prettier
- Run `yarn format` (alias for `yarn nice`) to fix both linting and formatting

#### Type Checking

- Run `yarn types` to check TypeScript types across the codebase
- Run `yarn typecheck` (alias for `yarn types`) for the same functionality

#### Building

- Run `yarn build` to build the package for distribution
- Run `yarn test:build` to build, test, check types, and lint in one command

#### Testing

- Run `yarn test` to run all tests
- Run `yarn test:build` for a comprehensive check (build + test + types + lint)

### Pre-commit Checklist

Before committing your changes, ensure:

1. ✅ Code is properly formatted: `yarn nice`
2. ✅ Types are valid: `yarn types`
3. ✅ All tests pass: `yarn test`
4. ✅ Build succeeds: `yarn build`

### Package Validation

For publishing:

- Run `yarn prepublishOnly` to validate exports and package configuration
- Run `yarn validate:exports` to check export configuration
- Run `yarn validate:pkg` to verify package conditions

## Pre-PR Checklist

Before creating a PR for the mobile-sdk-alpha package:

### Code Quality

- [ ] `yarn nice` passes (fixes linting and formatting)
- [ ] `yarn types` passes (TypeScript validation)
- [ ] `yarn test` passes (unit tests)
- [ ] `yarn build` succeeds (package builds correctly)

### SDK-Specific Validation

- [ ] Exports are properly configured (`yarn validate:exports`)
- [ ] Package conditions are valid (`yarn validate:pkg`)
- [ ] No breaking changes to public API (or properly documented)
- [ ] Migration guide updated (if applicable)
- [ ] Integration tests pass
- [ ] SDK integration with main app verified (if API changed)
- [ ] Cross-platform compatibility verified (React Native + Web)

### AI Review Preparation

- [ ] API changes documented with examples
- [ ] Breaking changes clearly flagged
- [ ] Performance implications noted
- [ ] Security considerations addressed

## Post-PR Validation

After PR creation:

### Automated Checks

- [ ] CI pipeline passes all stages
- [ ] No new linting/formatting issues
- [ ] Type checking passes
- [ ] Build artifacts generated successfully

### SDK-Specific Checks

- [ ] Package exports validation passes
- [ ] Integration with main app still works (tested in `@selfxyz/mobile-app`)
- [ ] No circular dependencies introduced
- [ ] Bundle size impact acceptable
- [ ] No nested `require('react-native')` calls in tests (causes OOM in CI)
- [ ] Cross-platform compatibility maintained (React Native + Web)
- [ ] Type definitions are complete and accurate

### Review Integration

- [ ] Address CodeRabbitAI feedback
- [ ] Resolve any security warnings
- [ ] Verify API compatibility
- [ ] Confirm migration path is clear

## Workflow Commands

### Pre-PR Validation

```bash
# Run all checks before PR
yarn nice
yarn types
yarn test
yarn build
yarn validate:exports
yarn validate:pkg
```

### Post-PR Cleanup

```bash
# After addressing review feedback
yarn nice  # Fix any formatting issues
yarn test  # Ensure tests still pass
yarn types # Verify type checking
yarn build # Confirm build still works
```

## Notes

- This package uses TypeScript with strict type checking
- ESLint is configured with TypeScript-specific rules
- Prettier is used for code formatting
- The `yarn nice` command is the recommended way to fix code quality issues
- Use the root Prettier and EditorConfig settings for consistency
- Uses Vitest for testing (not Jest) - see `tests/setup.ts` for configuration
- React Native is mocked for web compatibility in tests

## Integration Testing

### Testing SDK Integration with Main App

When making changes to the SDK API, verify integration:

```bash
# From app directory
cd ../../app
yarn build:deps  # Ensures latest SDK is built
yarn test        # Run app tests that use SDK
```

### Cross-Platform Considerations

- SDK must work in both React Native and Web environments
- Use platform detection when needed: `Platform.OS === 'web'`
- Test both environments when adding platform-specific code
- Vitest tests run in Node.js environment (mocked React Native)

## Testing Guidelines

**CRITICAL: Do NOT mock this package in tests!**

The mobile-sdk-alpha migration's primary purpose is to test REAL package methods, not mocked versions. When working with this package:

### Testing Requirements (PII-safe)

- Use actual imports from `@selfxyz/mobile-sdk-alpha`
- Write integration tests that exercise the real validation logic
- Test `isPassportDataValid()` with realistic, synthetic passport data (NEVER real user data)
- Verify `extractMRZInfo()` using published sample MRZ strings (e.g., ICAO examples)
- Ensure `parseNFCResponse()` works with representative, synthetic NFC data

### Anti-Patterns to Avoid

- Mocking the entire package in Jest setup
- Replacing real functions with mock implementations
- Using `jest.mock('@selfxyz/mobile-sdk-alpha')` without justification
- Testing with fake/placeholder data instead of realistic synthetic fixtures

### Example Integration Test Pattern (PII-safe)

```ts
import { isPassportDataValid } from '@selfxyz/mobile-sdk-alpha';

describe('Real SDK Integration', () => {
  it('validates passport data using realistic synthetic fixtures', () => {
    // Use realistic, synthetic passport data - NEVER real user data
    const syntheticPassportData = {
      // ... realistic but non-PII test data
    };
    const result = isPassportDataValid(syntheticPassportData, validationCallbacks);
    expect(result).toBe(true); // Real validation, not mock
  });
});
```

**⚠️ CRITICAL: Never use real user PII in tests. Use only synthetic, anonymized, or approved test vectors.**

## Test Memory Optimization

**CRITICAL**: Never create nested `require('react-native')` calls in tests. This causes out-of-memory (OOM) errors in CI/CD pipelines.

### Key Rules

- Use ES6 `import` statements instead of `require()` when possible
- Avoid dynamic `require()` calls in `beforeEach`/`afterEach` hooks
- Prefer top-level imports over nested requires
- This package uses Vitest (not Jest), but the same principles apply
- React Native is already mocked in `tests/setup.ts` using `vi.mock()` - use imports in test files

### Example Patterns

#### ✅ CORRECT: Use ES6 imports

```ts
// GOOD - Single import at top level
import { Platform } from 'react-native';

describe('MyComponent', () => {
  it('should work', () => {
    expect(Platform.OS).toBe('web');
  });
});
```

#### ❌ FORBIDDEN: Nested requires

```ts
// BAD - This will cause OOM issues
describe('MyComponent', () => {
  beforeEach(() => {
    const RN = require('react-native'); // First require
    const Component = require('./MyComponent'); // May internally require RN again = nested = OOM
  });
});
```

See `.cursor/rules/test-memory-optimization.mdc` for detailed guidelines and more examples.
