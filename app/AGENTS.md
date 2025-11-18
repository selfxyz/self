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
- [ ] No nested `require('react-native')` calls in tests (causes OOM in CI) - check with `grep -r "require('react-native')" app/tests/` and verify no nested patterns
- [ ] App builds successfully on target platforms

### Mobile-Specific Validation
- [ ] iOS build succeeds: `yarn ios` (simulator)
- [ ] Android build succeeds: `yarn android` (emulator/device)
- [ ] Web build succeeds: `yarn web`
- [ ] No sensitive data in logs (PII, credentials, tokens)
- [ ] Environment variables properly configured (check `.env` setup)
- [ ] E2E tests run in CI (not required locally - CI will run E2E tests automatically)

### AI Review Preparation
- [ ] Complex native module changes documented
- [ ] Platform-specific code paths explained
- [ ] Security-sensitive operations flagged
- [ ] Performance implications noted (including test memory patterns if tests were modified)

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
- [ ] No memory leaks introduced (including test memory patterns - see Test Memory Optimization section)
- [ ] Bundle size within acceptable limits
- [ ] No nested `require('react-native')` calls in tests (causes OOM in CI)
- [ ] Native modules work correctly (if native code was modified)
- [ ] Platform-specific code paths tested (iOS/Android/Web)

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

- `yarn ios` - Run on iOS simulator (builds dependencies automatically)
- `yarn android` - Run on Android emulator/device (builds dependencies automatically)
- `yarn web` - Run web version

### Development Tips

- Use `yarn build:deps` to build all workspace dependencies before running the app
- For iOS: Ensure Xcode scheme is set to "OpenPassport" (see memory)
- For Android: Ensure emulator is running or device is connected before `yarn android`
- Metro bundler starts automatically; use `yarn start` to run it separately

## E2E Testing

The app uses Maestro for end-to-end testing. **E2E tests run automatically in CI/CD pipelines - they are not required to run locally.**

### CI/CD E2E Testing

- E2E tests run automatically in GitHub Actions workflows
- iOS and Android E2E tests run on PRs and main branch
- No local setup required - CI handles all E2E test execution

### Local E2E Testing (Optional)

If you need to run E2E tests locally for debugging:

**Prerequisites:**
- Maestro CLI installed: `curl -Ls "https://get.maestro.mobile.dev" | bash`
- iOS: Simulator running or device connected
- Android: Emulator running or device connected
- App built and installed on target device/simulator

**Running Locally:**
```bash
# iOS E2E tests
yarn test:e2e:ios

# Android E2E tests
yarn test:e2e:android

# Or use the local test script (handles setup automatically)
./scripts/test-e2e-local.sh ios
./scripts/test-e2e-local.sh android
```

**E2E Test Files:**
- iOS: `tests/e2e/launch.ios.flow.yaml`
- Android: `tests/e2e/launch.android.flow.yaml`

## Environment Variables

The app uses `react-native-dotenv` for environment configuration.

### Setup

- Create `.env` file in `app/` directory (see `.env.example` if available)
- Environment variables are loaded via `@env` import
- For secrets: Use `.env.secrets` (gitignored) for local development
- In CI: Environment variables are set in workflow files

### Common Environment Variables

- `GOOGLE_SIGNIN_ANDROID_CLIENT_ID` - Google Sign-In configuration
- Various API endpoints and keys (check `app/env.ts` for full list)

### Testing with Environment Variables

- Tests use mocked environment variables (see `jest.setup.js`)
- E2E tests use actual environment configuration
- Never commit `.env.secrets` or sensitive values

## Deployment

### Mobile Deployment

The app uses Fastlane for iOS and Android deployment.

### Deployment Commands

```bash
# Deploy both platforms (requires confirmation)
yarn mobile-deploy

# Deploy iOS only
yarn mobile-deploy:ios

# Deploy Android only
yarn mobile-deploy:android

# Force local deployment (for testing deployment scripts)
yarn mobile-local-deploy
```

### Deployment Prerequisites

- See `app/docs/MOBILE_DEPLOYMENT.md` for detailed deployment guide
- Required secrets configured in CI/CD or `.env.secrets` for local
- iOS: App Store Connect API keys, certificates, provisioning profiles
- Android: Play Store service account, keystore

### Deployment Checklist

- [ ] Version bumped in `package.json` and `app.json`
- [ ] Changelog updated
- [ ] All unit tests pass (`yarn test`)
- [ ] Build succeeds for target platform
- [ ] Required secrets/environment variables configured
- [ ] Fastlane configuration verified
- [ ] CI E2E tests pass (automatically run in CI, no local action needed)

## Test Memory Optimization

**CRITICAL**: Never create nested `require('react')` or `require('react-native')` calls in tests. This causes out-of-memory (OOM) errors in CI/CD pipelines that hide actual test failures.

### Automated Enforcement

The project has multiple layers of protection:

1. **ESLint Rule**: Blocks `require('react')` and `require('react-native')` in test files
2. **Pre-commit Script**: Run `node scripts/check-test-requires.cjs` to validate
3. **CI Fast-Fail**: GitHub Actions checks for nested requires before running tests

### Quick Check
Before committing, verify no nested requires:
```bash
# Automated check (recommended)
node scripts/check-test-requires.cjs

# Manual check
grep -r "require('react')" app/tests/
grep -r "require('react-native')" app/tests/
```

### Best Practices
- **Always use ES6 `import` statements** - Never use `require('react')` or `require('react-native')` in test files
- Put all imports at the top of the file - No dynamic imports in hooks
- Avoid `require()` calls in `beforeEach`/`afterEach` hooks
- React and React Native are already mocked in `jest.setup.js` - use imports in test files

### Detailed Guidelines
See `.cursor/rules/test-memory-optimization.mdc` for comprehensive guidelines, examples, and anti-patterns.
