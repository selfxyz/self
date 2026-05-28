# AGENTS Instructions

## Prerequisites

- Node.js 22.x (`nvm use`), pnpm via Corepack (`corepack enable` — version is pinned in root `package.json`)
- macOS/iOS:
  - Xcode and Command Line Tools, CocoaPods (Ruby installed)
  - From `app/ios`: `bundle install && bundle exec pod install` or from `app`: `npx pod-install`
- Android:
  - Android SDK + Emulator, ANDROID_HOME configured, JDK 17 (set JAVA_HOME)
- Helpful: Watchman (macOS), `pnpm install` at repo root

## Pre-PR Checklist

Before creating a PR for the mobile app:

### Code Quality

- [ ] `pnpm nice` passes (fixes linting and formatting)
- [ ] `pnpm types` passes (TypeScript validation)
- [ ] `pnpm test` passes (unit tests)
- [ ] No nested `require('react-native')` calls in tests (causes OOM in CI) - check with `grep -r "require('react-native')" app/tests/` and verify no nested patterns
- [ ] App builds successfully on target platforms

### Mobile-Specific Validation

- [ ] iOS build succeeds: `pnpm ios` (simulator)
- [ ] Android build succeeds: `pnpm android` (emulator/device)
- [ ] Web build succeeds: `pnpm web`
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
pnpm nice

# Lint source files
pnpm lint

# Check types
pnpm types

# Run tests
pnpm test
```

## Workflow Commands

### Pre-PR Validation

```bash
# Run all checks before PR
pnpm nice
pnpm lint
pnpm types
pnpm test
pnpm ios  # Test iOS build
pnpm android  # Test Android build
```

### Post-PR Cleanup

```bash
# After addressing review feedback
pnpm nice  # Fix any formatting issues
pnpm test  # Ensure tests still pass
pnpm types # Verify type checking
```

## Running the App

- `pnpm ios` - Run on iOS simulator (builds dependencies automatically)
- `pnpm android` - Run on Android emulator/device (builds dependencies automatically)
- `pnpm web` - Run web version

### Development Tips

- Use `pnpm build:deps` to build all workspace dependencies before running the app
- For iOS: Ensure Xcode scheme is set to "OpenPassport" (see memory)
- For Android: Ensure emulator is running or device is connected before `pnpm android`
- Metro bundler starts automatically; use `pnpm start` to run it separately

#### Workspace-Root Preflight (do not bypass)

`yarn ios`, `yarn start`, and `yarn start:clean` run `node scripts/preflight-workspace-config.cjs` before Metro. The preflight fails fast if a stray `react-native.config.{js,cjs,mjs}` or `metro.config.{js,cjs,mjs}` exists at the **monorepo root**. Either file at the workspace root hijacks the RN CLI / Metro project-root anchor (the CLI walks up from CWD and stops at the first config it finds), making Metro resolve `./index` against the repo root instead of `app/`. The failure mode is a confusing `Metro resolver failed for module "./index"` that's easy to misdiagnose.

These files are easy to miss locally because broad personal gitignore rules (e.g. `*.config.*`) can hide them from `git status`. Do **not** bypass the preflight by running `react-native start` / `npx expo start` directly — fix the underlying config (delete the stray file at the root). See `app/scripts/preflight-workspace-config.cjs` for the exact patterns checked.

#### iOS Simulator Selection

`pnpm ios` now selects a simulator by UDID, shuts down stale booted simulators, explicitly boots the chosen device, waits for boot completion, then starts the React Native iOS build against that simulator.

| Env var | Purpose |
|---|---|
| `IOS_SIMULATOR_DEVICE` | Case-insensitive iPhone name substring filter, for example `iPhone 16 Pro` |
| `IOS_SIMULATOR_RUNTIME` | iOS runtime version filter, for example `18.4` or `18-4` |

Default device priority when no env vars are set:

- `iPhone 16 Pro`
- `iPhone 16`
- `iPhone 15 Pro`
- `iPhone 15`
- First available iPhone on the newest installed iOS runtime

`IOS_SIMULATOR_DEVICE` uses a case-insensitive substring match. If multiple devices match, the launcher uses the first match from the newest matching runtime after applying the default priority order.

Examples:

```bash
pnpm ios
IOS_SIMULATOR_DEVICE="iPhone 16 Pro" pnpm ios
IOS_SIMULATOR_RUNTIME="18.4" pnpm ios
IOS_SIMULATOR_DEVICE="iPhone 15" IOS_SIMULATOR_RUNTIME="18-4" pnpm ios
```

If a pinned simulator cannot be found, the launcher exits with a readable error that includes the available iPhone simulators for the matching runtimes.

The launcher currently shuts down all booted simulators before booting the selected one. If you keep other simulators open for unrelated work, relaunch them after `pnpm ios`.

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
pnpm test:e2e:ios

# Android E2E tests
pnpm test:e2e:android

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
pnpm mobile-deploy

# Deploy iOS only
pnpm mobile-deploy:ios

# Deploy Android only
pnpm mobile-deploy:android

# Force local deployment (for testing deployment scripts)
pnpm mobile-local-deploy
```

### Deployment Prerequisites

- See `app/docs/MOBILE_DEPLOYMENT.md` for detailed deployment guide
- Required secrets configured in CI/CD or `.env.secrets` for local
- iOS: App Store Connect API keys, certificates, provisioning profiles
- Android: Play Store service account, keystore

### Deployment Checklist

- [ ] Version bumped in `package.json` and `app.json`
- [ ] Changelog updated
- [ ] All unit tests pass (`pnpm test`)
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

## Linear Issue Interaction

When working with Linear issues during development:

- **`save_comment`** for: status updates, progress notes, blockers, linking PRs, corrections, decision records
- **`save_issue`** for: changing status, priority, assignee, labels (structured fields only)
- **`create_document`** for: attaching specs as Linear documents

**Never overwrite an issue description.** Descriptions are the original scope set at creation time. All subsequent context goes in comments. If the description has a factual error, add a comment explaining the correction — do not silently rewrite it.

## SDK Architecture

The Self Wallet app serves as a **test environment** for the SDK refactor. For SDK architecture context:

- **[SDK Overview](../specs/projects/sdk/OVERVIEW.md)** — System architecture, bridge protocol, decision matrix (read-only reference)
- **Implementation specs** — Canonical source is `specs/projects/sdk/workstreams/<scope>/plans/` (version-controlled). Linear documents attached to issues are mirrored copies for tracking/discovery. When in doubt, trust the repo spec.
