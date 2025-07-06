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
  - `yarn lint` – lints all packages in parallel.
  - `yarn gitleaks` – scan staged changes for secrets. If the script fails
    because the `gitleaks` binary cannot be found, you can install it with
    `yarn dlx gitleaks` or skip this step.
  - `yarn build` – build all workspaces except `contracts`.
  - `yarn workspace @selfxyz/contracts build` – compile Solidity contracts.
    This build occasionally fails with a Hardhat config error; if so, note the
    error but continue.
  - `yarn types` – run type checking across the repo.

### Tests
- Run unit tests where available:
  - `yarn workspace @selfxyz/common test`
  - `yarn workspace @selfxyz/circuits test`  # may fail if OpenSSL algorithms are missing
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
