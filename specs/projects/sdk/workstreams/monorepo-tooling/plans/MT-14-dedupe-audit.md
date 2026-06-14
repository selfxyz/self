## Audit nested duplicates and dedupe lockfile

> Last updated: 2026-05-20
> Status: Draft

- Workstream: monorepo-tooling
- Backlog IDs: MT-14, MT-18
- Owner: TBD
- Branch: TBD
- PR: TBD

### Why

`react-native-blur-effect` exposed one nested React Native duplicate, but there
may be more duplicate transitive versions left by the migration. This plan
separates dependency graph cleanup from strictness and linker changes so the
lockfile diff stays reviewable.

### Dependencies

- MT-1 should land first so blur-effect duplicates are gone before the audit.
- MT-6 should land first if overrides or patch migration would otherwise create
  lockfile churn.

### Scope

- Inventory nested `node_modules/*/node_modules/*` duplicates.
- Identify RN-adjacent duplicates and stale peer ranges.
- Run `pnpm dedupe` and audit the lockfile diff.
- Add or remove overrides only when the version choice is low-risk and
  justified.
- Keep intentional duplicate versions documented when packages require
  incompatible ranges.

### Out of Scope

- Major dependency upgrades.
- Isolated linker migration.
- Fixing peer strictness failures unless they are direct duplicate causes.

### Validation

```bash
find node_modules -mindepth 2 -name node_modules -type d
pnpm dedupe --check
pnpm --filter @selfxyz/mobile-app test
pnpm types
```

Additional checks:

- Lockfile diff is reviewed package-by-package, not accepted blindly.
- Any retained duplicate with user-facing risk is documented in the PR.

### Files Modified

| File                                 | Change                                    |
| ------------------------------------ | ----------------------------------------- |
| `pnpm-lock.yaml`                     | Dedupe result.                            |
| `package.json` / workspace manifests | Add narrow overrides only when justified. |

### Definition of Done

- [ ] Nested duplicates are inventoried.
- [ ] `pnpm dedupe --check` exits clean after the change.
- [ ] Retained duplicates are intentional and documented.
- [ ] Mobile app tests and repo typecheck pass.
