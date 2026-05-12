# pnpm migration status

## Current state (as of 2026-05-12)

We are **not fully migrated** to pnpm yet.

What is done:
- Root `packageManager` points to pnpm.
- `pnpm-workspace.yaml` exists.
- `pnpm-lock.yaml` exists.

What is not done:
- Most package scripts still call `yarn ...`.
- CI workflows and composite actions are still Yarn-first.
- Some workspaces still declare `packageManager: yarn@4.x`.
- Repo still includes Yarn artifacts (for now), including `yarn.lock` and `.yarnrc.yml`.

## Should we remove Yarn artifacts now?

**No — not yet.**

Removing Yarn artifacts before script + CI migration would break local workflows and CI.

## Recommended phased migration

1. **Script migration (safe first):** convert root scripts from `yarn` to `pnpm` and validate commands.
2. **Workspace migration:** update each workspace `package.json` scripts and `packageManager` fields.
3. **CI migration:** replace `yarn-install` and `cache-yarn` usage with pnpm equivalents.
4. **Cutover cleanup:** remove `yarn.lock`, `.yarnrc.yml`, and Yarn-only CI actions after green CI.

## Definition of done

- `rg -n "\byarn\b" package.json app circuits common contracts sdk packages .github` returns only intentional historical/docs references.
- CI passes end-to-end with pnpm-only install and caching.
- Yarn artifacts removed in same cutover PR.
