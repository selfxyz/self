# AGENTS Instructions

This repository is a Yarn v4 monorepo with several workspaces:

- `app` – mobile app (@selfxyz/mobile-app)
- `circuits` – zk-SNARK circuits (@selfxyz/circuits)
- `common` – shared utilities (@selfxyz/common)
- `contracts` – solidity contracts (@selfxyz/contracts)
- `sdk/core` – core TypeScript SDK (@selfxyz/core)
- `sdk/qrcode` – qrcode SDK (@selfxyz/qrcode)

## Workflow

### Setup

- Run `yarn install` once before running any other commands. This installs root dependencies and sets up husky hooks.

### Commit Checks

Before committing, run the following commands:

```bash
# Lint all packages in parallel
yarn lint

# Build all workspaces except `contracts`
yarn build

# Compile Solidity contracts (may occasionally throw a Hardhat config error)
yarn workspace @selfxyz/contracts build

# Run type-checking across the repo
yarn types
```

### Tests

- Run unit tests where available:
  - `yarn workspace @selfxyz/common test`
  - `yarn workspace @selfxyz/circuits test` # may fail if OpenSSL algorithms are missing
  - `yarn workspace @selfxyz/mobile-app test`
  - Tests for `@selfxyz/contracts` are currently disabled in CI and may be skipped.

### Formatting

- Use Prettier configuration from `.prettierrc` files.
- Follow `.editorconfig` for line endings and indentation.

### Commit Guidelines

- Write short, imperative commit messages (e.g. `Fix address validation`).
- The pull request body should summarize the changes and mention test results.

## Scope

These instructions apply to the entire repository unless overridden by a nested `AGENTS.md`.
