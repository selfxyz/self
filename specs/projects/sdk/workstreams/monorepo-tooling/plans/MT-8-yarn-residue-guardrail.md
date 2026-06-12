## Remove Yarn residue and add guardrail

> Last updated: 2026-05-20
> Status: Draft

- Workstream: monorepo-tooling
- Backlog IDs: MT-8, MT-15
- Owner: TBD
- Branch: TBD
- PR: TBD

### Why

Root and workspace instructions are pnpm-first, but the repository should also
block accidental reintroduction of Yarn artifacts after the migration.

### Scope

- Sweep setup, test, build, and CI docs for stale Yarn commands.
- Remove any remaining `.yarnrc*`, `.yarn/`, or `yarn.lock` artifacts if they
  are still present.
- Add a lightweight guardrail that fails when active docs, scripts, or workflow
  files reintroduce Yarn package-manager commands.
- Allow intentional historical references in changelogs or migration notes.

### Out of Scope

- Rewriting unrelated docs for style.
- Changing package-manager behavior beyond preventing Yarn reintroduction.
- Moving pnpm config; MT-6 owns that.

### Validation

```bash
rg -i '\byarn\b' --glob '!pnpm-lock.yaml' --glob '!CHANGELOG*'
pnpm nice
pnpm test
```

The `rg` result should contain only intentional historical references or the
guardrail implementation itself.

### Files Modified

| File                                        | Change                                                 |
| ------------------------------------------- | ------------------------------------------------------ |
| `CLAUDE.md`                                 | Remove stale Yarn commands if found.                   |
| `AGENTS.md` and workspace `AGENTS.md` files | Keep setup and validation pnpm-first.                  |
| `.github/workflows/*.yml`                   | Remove stale Yarn references if found.                 |
| `scripts/*` or package scripts              | Add the guardrail in the repo's existing script style. |

### Definition of Done

- [ ] No active setup, CI, or package script tells contributors to run Yarn.
- [ ] Yarn artifact files are absent.
- [ ] Guardrail catches a reintroduced `yarn` package-manager command.
- [ ] Formatting/test command for the touched workspace passes.
