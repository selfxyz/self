# AGENTS Instructions

## Package Management

**Package Manager:** pnpm (pinned via `packageManager` in root `package.json`)

**Commands to use:** `pnpm install`, `pnpm add`, `pnpm remove`, `pnpm --filter <workspace>` for workspace-scoped commands.

**Note:** Do not use `npm` or `yarn`.

This repository is a pnpm monorepo (`pnpm-workspace.yaml`, `nodeLinker: hoisted`) with several workspaces:

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
  - `corepack enable` (Corepack reads the pinned pnpm version from `packageManager` in root `package.json`)
  - Verify: `node -v && pnpm -v`
- Run `pnpm install` once before running any other commands. This installs root dependencies and sets up husky hooks.

### Pre-PR Checklist

Before creating a PR, ensure:

#### Code Quality

- [ ] `pnpm nice` (or equivalent) passes in affected workspaces
- [ ] `pnpm types` passes across the repo
- [ ] `pnpm test` passes in affected packages
- [ ] `pnpm build` succeeds for all workspaces

#### AI Review Preparation

- [ ] Clear, imperative commit messages (e.g. `Fix address validation`)
- [ ] PR description includes context for AI reviewers
- [ ] Complex changes have inline comments explaining intent
- [ ] Security-sensitive changes flagged for special review
- [ ] Review/spec text is signal-only: remove non-actionable praise, back-patting, and generic commentary; keep concrete issues, risks, decisions, owners, next steps, and validation evidence

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
# Fix linting and formatting issues in workspaces changed since HEAD
pnpm --filter '...[HEAD]' --if-present run nice

# Lint all packages in parallel
pnpm lint

# Build all workspaces except `contracts`
pnpm build

# Compile Solidity contracts (may occasionally throw a Hardhat config error)
pnpm --filter @selfxyz/contracts build

# Run type-checking across the repo
pnpm types
```

### Workflow Commands

#### Pre-PR Validation

```bash
# Run all checks before PR - only on changed workspaces since main
# Format and lint changed workspaces (workspace-specific scripts first, then fallback to root)
pnpm --filter '...[origin/main]' --if-present run nice

# Run global checks across all workspaces
pnpm lint && pnpm types && pnpm build && pnpm test

# Alternative: Run workspace-specific checks for changed workspaces only
# pnpm --filter '...[origin/main]' --if-present run lint
# pnpm --filter '...[origin/main]' --if-present run types
# pnpm --filter '...[origin/main]' --if-present run build
# pnpm --filter '...[origin/main]' --if-present run test
```

#### Post-PR Cleanup

```bash
# After addressing review feedback
pnpm nice  # Fix any formatting issues in affected workspaces
pnpm test  # Ensure tests still pass
pnpm types # Verify type checking
```

### Tests

- Run unit tests where available:
  - `pnpm --filter @selfxyz/common test`
  - `pnpm --filter @selfxyz/circuits test` # may fail if OpenSSL algorithms are missing
  - `pnpm --filter @selfxyz/mobile-app test`
  - `pnpm --filter @selfxyz/mobile-sdk-alpha test`
  - For Noir circuits, run `nargo test -p <crate>` in each `noir/crates/*` directory.
  - Tests for `@selfxyz/contracts` are currently disabled in CI and may be skipped.

- E2E tests (mobile app) - **Run automatically in CI/CD, not required locally**:
  - E2E tests execute automatically in GitHub Actions on PRs and main branch
  - Local E2E testing is optional (see `app/AGENTS.md` for local setup if needed)
  - Commands available: `pnpm --filter @selfxyz/mobile-app test:e2e:ios` / `test:e2e:android`

#### Test Memory Optimization

**CRITICAL**: Never create nested `require('react-native')` calls in tests. This causes out-of-memory (OOM) errors in CI/CD pipelines.

- Use ES6 `import` statements instead of `require()` when possible
- Avoid dynamic `require()` calls in `beforeEach`/`afterEach` hooks
- Prefer top-level imports over nested requires
- See `.cursor/rules/test-memory-optimization.mdc` for detailed guidelines

### CI Caching

Use the shared composite actions in `.github/actions` when caching dependencies in GitHub workflows. They provide consistent cache paths and keys:

- `cache-pnpm` for the pnpm content-addressable store (do not cache `node_modules`)
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

#### pnpm Install Fails

- Ensure Node.js 22.x is installed: `nvm use`
- Prune the pnpm store: `pnpm store prune`
- Remove `node_modules` and reinstall: `rm -rf node_modules && pnpm install`

#### Build Failures

- Run `pnpm build:deps` in affected workspace first
- Check workspace-specific `AGENTS.md` for platform requirements
- For mobile app: ensure iOS/Android prerequisites are met (see `app/AGENTS.md`)

#### Test Failures

- Check workspace-specific test setup requirements
- For mobile app tests: ensure native modules are properly mocked
- See `.cursor/rules/test-memory-optimization.mdc` for test memory issues

#### Type Errors

- Run `pnpm types` to see all type errors across workspaces
- Some packages may need to be built first: `pnpm build:deps`

## SDK Specs

The `specs/` folder contains architecture and implementation specs for the Self SDK project (WebView engine + native shells). These specs are designed to serve as both human documentation and AI agent prompts.

### Spec Structure & Naming Rules

- Do not create one-file folders. If a folder would contain only one markdown file, keep that file at the parent project level.
- File names should describe doc type, not repeat project name when already inside the project folder.
- Preferred project-level names: `INDEX.md`, `OVERVIEW.md`, `PLAN.md`, `STATUS.md`, `HANDOFF.md`, `REVIEW.md`, `ARCHITECTURE.md`, `INITIATIVE.md`.
- `INDEX.md` is navigation only (entrypoint/table of contents for that folder).
- `OVERVIEW.md` is substantive context (architecture/scope/status summary), not just a link list.
- Do not use `INDEX.md` and `OVERVIEW.md` as synonyms for the same purpose.
- Workstream docs under `workstreams/<scope>/` use `SPEC.md` (context + implementation in one file).
- PR execution docs belong under `workstreams/<scope>/plans/<BACKLOG-ID>-<slug>.md`; use one plan file per PR.
- Use suffixed variants (for example `SPEC-<TOPIC>.md`) only when multiple specs of the same type are required in the same folder.
- When renaming/moving spec files, update all references in `specs/`, `AGENTS.md`, and `CLAUDE.md` in the same change.

### Spec Writing Rules

- Qualify coverage claims. Distinguish unit-tested/shared-utility coverage from handler-level, integration, or end-to-end coverage; do not say "tested" without naming the actual coverage level.
- Flag invariant departures. If a spec intentionally departs from active architecture rules or repo invariants, call out the conflict explicitly, justify the departure, and list the docs that must be updated if the direction is accepted.

**Start here:** [specs/README.md](./specs/README.md) — table of contents and reading order.

Key files:

- `specs/projects/sdk/INDEX.md` — SDK project entry point, workstream links
- `specs/projects/sdk/OVERVIEW.md` — Architecture, bridge protocol, module table, execution status
- `specs/projects/sdk/workstreams/*/SPEC.md` — Durable workstream context, invariants, backlog, active plan links
- `specs/projects/sdk/workstreams/*/plans/*.md` — PR-sized execution plans
- `specs/projects/sdk/paused/*/SPEC.md` — Paused workstreams retained for future reuse (native-shells, integrations, rn-sdk, native-consolidation)

**Before implementing SDK work:** Read `CLAUDE.md` Key Rules and the relevant workstream `SPEC.md` under `specs/projects/sdk/workstreams/`. These specs contain explicit constraints ("You will NOT..."), validation commands, and file ownership boundaries that prevent common mistakes.

## Scope

These instructions apply to the entire repository unless overridden by a nested `AGENTS.md`.
