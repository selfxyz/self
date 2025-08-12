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

- [ ] Exports are properly configured
- [ ] Package conditions are valid
- [ ] No breaking changes to public API (or properly documented)
- [ ] Migration guide updated (if applicable)
- [ ] Integration tests pass

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
- [ ] Integration with main app still works
- [ ] No circular dependencies introduced
- [ ] Bundle size impact acceptable

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
