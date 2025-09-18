# AGENTS Instructions

## Prerequisites

- Node.js 22.x (`nvm use`), Yarn via Corepack (`corepack enable && corepack prepare yarn@stable --activate`)
- macOS/iOS:
  - Xcode and Command Line Tools, CocoaPods (Ruby installed)
  - From `app/ios`: `bundle install && bundle exec pod install` or from `app`: `npx pod-install`
- Android:
  - Android SDK + Emulator, ANDROID_HOME configured, JDK 17 (set JAVA_HOME)
- Helpful: Watchman (macOS), `yarn install` at repo root

## Pre-PR Checklist

Before creating a PR for the mobile app:

### Code Quality
- [ ] `yarn nice` passes (fixes linting and formatting)
- [ ] `yarn types` passes (TypeScript validation)
- [ ] `yarn test` passes (unit tests)
- [ ] App builds successfully on target platforms

### Mobile-Specific Validation
- [ ] iOS build succeeds: `yarn ios` (simulator)
- [ ] Android build succeeds: `yarn android` (emulator/device)
- [ ] Web build succeeds: `yarn web`
- [ ] No sensitive data in logs (PII, credentials, tokens)

### AI Review Preparation
- [ ] Complex native module changes documented
- [ ] Platform-specific code paths explained
- [ ] Security-sensitive operations flagged
- [ ] Performance implications noted

## Post-PR Validation

After PR creation:

### Automated Checks
- [ ] CI pipeline passes all stages
- [ ] No new linting/formatting issues
- [ ] Type checking passes
- [ ] Build artifacts generated successfully

### Mobile-Specific Checks
- [ ] App launches without crashes
- [ ] Core functionality works on target platforms
- [ ] No memory leaks introduced
- [ ] Bundle size within acceptable limits

### Review Integration
- [ ] Address CodeRabbitAI feedback
- [ ] Resolve any security warnings
- [ ] Confirm no sensitive data exposed

## Recommended Workflow

```bash
# Fix formatting and linting issues
yarn nice

# Lint source files
yarn lint

# Check types
yarn types

# Run tests
yarn test
```

## Workflow Commands

### Pre-PR Validation
```bash
# Run all checks before PR
yarn nice
yarn lint
yarn types
yarn test
yarn ios  # Test iOS build
yarn android  # Test Android build
```

### Post-PR Cleanup
```bash
# After addressing review feedback
yarn nice  # Fix any formatting issues
yarn test  # Ensure tests still pass
yarn types # Verify type checking
```

## Running the App

- `yarn ios`
