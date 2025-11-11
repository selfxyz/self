# AGENTS Instructions

## Package Management

**Package Manager:** Yarn

**Commands to use:** yarn install, yarn add, yarn remove

**Note:** Do not use npm or pnpm.

This repository is a Yarn v4 monorepo with several workspaces:

- `app` – mobile app (@selfxyz/mobile-app)
- `circuits` – zk-SNARK circuits (@selfxyz/circuits)
- `common` – shared utilities (@selfxyz/common)
- `contracts` – solidity contracts (@selfxyz/contracts)
- `sdk/core` – core TypeScript SDK (@selfxyz/core)
- `sdk/qrcode` – qrcode SDK (@selfxyz/qrcode)
- `packages/mobile-sdk-alpha` – alpha version of the SDK (@selfxyz/mobile-sdk-alpha)
- `noir` – noir circuits

## Workflow

### Setup

- Ensure Node.js 22.x is installed (see `.nvmrc` for exact version), then:
  - `nvm use`
  - `corepack enable && corepack prepare yarn@stable --activate`
  - Verify: `node -v && yarn -v`
- Run `yarn install` once before running any other commands. This installs root dependencies and sets up husky hooks.

### Pre-PR Checklist

Before creating a PR, ensure:

#### Code Quality

- [ ] `yarn nice` (or equivalent) passes in affected workspaces
- [ ] `yarn types` passes across the repo
- [ ] `yarn test` passes in affected packages
- [ ] `yarn build` succeeds for all workspaces

#### AI Review Preparation

- [ ] Clear commit messages following conventional format
- [ ] PR description includes context for AI reviewers
- [ ] Complex changes have inline comments explaining intent
- [ ] Security-sensitive changes flagged for special review

#### Follow-up Planning

- [ ] Identify any known issues that need separate PRs
- [ ] Note any performance implications
- [ ] Document any breaking changes

### Post-PR Validation

After PR creation:

#### Automated Checks

- [ ] CI pipeline passes all stages
- [ ] No new linting/formatting issues introduced
- [ ] Type checking passes in all affected workspaces
- [ ] Build artifacts generated successfully

#### Review Integration

- [ ] Address CodeRabbitAI feedback (or document why not)
- [ ] Resolve any security warnings
- [ ] Verify performance benchmarks still pass
- [ ] Confirm no sensitive data exposed in logs/comments

### Commit Checks

Before committing, run the following commands:

```bash
# Fix linting and formatting issues automatically (for packages that support it)
yarn workspaces foreach -A -p -v --topological-dev --since=HEAD run nice --if-present

# Lint all packages in parallel
yarn lint

# Build all workspaces except `contracts`
yarn build

# Compile Solidity contracts (may occasionally throw a Hardhat config error)
yarn workspace @selfxyz/contracts build

# Run type-checking across the repo
yarn types
```

### Workflow Commands

#### Pre-PR Validation

```bash
# Run all checks before PR - only on changed workspaces since main
# Format and lint changed workspaces (workspace-specific scripts first, then fallback to root)
yarn workspaces foreach -A -p -v --topological-dev --since=origin/main run nice --if-present

# Run global checks across all workspaces
yarn lint && yarn types && yarn build && yarn test

# Alternative: Run workspace-specific checks for changed workspaces only
# yarn workspaces foreach -A -p -v --topological-dev --since=origin/main run lint --if-present
# yarn workspaces foreach -A -p -v --topological-dev --since=origin/main run types --if-present
# yarn workspaces foreach -A -p -v --topological-dev --since=origin/main run build --if-present
# yarn workspaces foreach -A -p -v --topological-dev --since=origin/main run test --if-present
```

#### Post-PR Cleanup

```bash
# After addressing review feedback
yarn nice  # Fix any formatting issues in affected workspaces
yarn test  # Ensure tests still pass
yarn types # Verify type checking
```

### Tests

- Run unit tests where available:
  - `yarn workspace @selfxyz/common test`
  - `yarn workspace @selfxyz/circuits test` # may fail if OpenSSL algorithms are missing
  - `yarn workspace @selfxyz/mobile-app test`
  - `yarn workspace @selfxyz/mobile-sdk-alpha test`
  - For Noir circuits, run `nargo test -p <crate>` in each `noir/crates/*` directory.
  - Tests for `@selfxyz/contracts` are currently disabled in CI and may be skipped.

- E2E tests (mobile app) - **Run automatically in CI/CD, not required locally**:
  - E2E tests execute automatically in GitHub Actions on PRs and main branch
  - Local E2E testing is optional (see `app/AGENTS.md` for local setup if needed)
  - Commands available: `yarn workspace @selfxyz/mobile-app test:e2e:ios` / `test:e2e:android`

#### Test Memory Optimization

**CRITICAL**: Never create nested `require('react-native')` calls in tests. This causes out-of-memory (OOM) errors in CI/CD pipelines.

- Use ES6 `import` statements instead of `require()` when possible
- Avoid dynamic `require()` calls in `beforeEach`/`afterEach` hooks
- Prefer top-level imports over nested requires
- See `.cursor/rules/test-memory-optimization.mdc` for detailed guidelines

### CI Caching

Use the shared composite actions in `.github/actions` when caching dependencies in GitHub workflows. They provide consistent cache paths and keys:

- `cache-yarn` for Yarn dependencies
- `cache-bundler` for Ruby gems
- `cache-gradle` for Gradle wrappers and caches
- `cache-pods` for CocoaPods

Each action accepts an optional `cache-version` input (often combined with `GH_CACHE_VERSION` and a tool-specific version). Avoid calling `actions/cache` directly so future workflows follow the same strategy.

### Formatting

- Use Prettier configuration from `.prettierrc` files.
- Follow `.editorconfig` for line endings and indentation.

### Commit Guidelines

- Write short, imperative commit messages (e.g. `Fix address validation`).
- The pull request body should summarize the changes and mention test results.

## Workspace-Specific Instructions

Some workspaces have additional instructions in their own `AGENTS.md` files:

- `app/AGENTS.md` - Mobile app development, E2E testing, deployment
- `packages/mobile-sdk-alpha/AGENTS.md` - SDK development, testing guidelines, package validation
- `noir/AGENTS.md` - Noir circuit development

These workspace-specific files override or extend the root instructions for their respective areas.

## Troubleshooting

### Common Issues

#### Yarn Install Fails

- Ensure Node.js 22.x is installed: `nvm use`
- Clear Yarn cache: `yarn cache clean`
- Remove `node_modules` and reinstall: `rm -rf node_modules && yarn install`

#### Build Failures

- Run `yarn build:deps` in affected workspace first
- Check workspace-specific `AGENTS.md` for platform requirements
- For mobile app: ensure iOS/Android prerequisites are met (see `app/AGENTS.md`)

#### Test Failures

- Check workspace-specific test setup requirements
- For mobile app tests: ensure native modules are properly mocked
- See `.cursor/rules/test-memory-optimization.mdc` for test memory issues

#### Type Errors

- Run `yarn types` to see all type errors across workspaces
- Some packages may need to be built first: `yarn build:deps`

## Scope

These instructions apply to the entire repository unless overridden by a nested `AGENTS.md`.
