# Contributing to Self

Thank you for your interest in contributing to Self! Please read the following guidelines before submitting your contribution.

## Security Vulnerabilities

**Do not open a public PR or GitHub issue for security bugs.**

If you discover a security vulnerability, please report it responsibly by emailing **team@self.xyz**. This helps protect our users while we work on a fix. Security researchers may be eligible for a bounty.

## Ground Rules

### What We Don't Accept

- **No README-only or typo-fix PRs** — We do not accept pull requests that only fix typos or update documentation. Focus your contributions on meaningful code changes.

### Branching Strategy

- **Always branch from `dev`** — All pull requests must be opened against the `dev` branch. PRs targeting `main` or other branches will be rejected.

### For Complex Features

- **Open an issue first** — If your contribution targets core components or introduces complex features, please start by opening an issue describing your implementation plan. This allows maintainers to provide feedback before you invest significant time in development.

## Code Standards

### Naming Conventions

- **Follow the naming conventions of the subrepo** — Each workspace (`app`, `circuits`, `common`, `contracts`, `sdk/*`, etc.) may have its own conventions. Review existing code in the target workspace and match its style.

### Formatting & Linting

Before submitting your PR, ensure your code passes all formatting and linting checks:

```bash
# Format your code
yarn format

# Run linting
yarn lint

# For workspace-specific formatting (recommended)
yarn workspaces foreach -A -p -v --topological-dev --since=origin/dev run nice --if-present
```

## Pull Request Checklist

- [ ] Branch is based on `dev`
- [ ] Code follows the naming conventions of the target workspace
- [ ] `yarn lint` passes
- [ ] `yarn format` has been run
- [ ] For complex changes: issue was opened and discussed first
- [ ] Commit messages are clear and follow conventional format

## Questions?

If you're unsure about anything, feel free to open an issue for discussion before starting work.
