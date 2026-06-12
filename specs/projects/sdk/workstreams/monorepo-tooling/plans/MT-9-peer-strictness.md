## Re-enable pnpm peer and exotic-subdependency strictness

> Last updated: 2026-05-20
> Status: Draft

- Workstream: monorepo-tooling
- Backlog IDs: MT-9, MT-11
- Owner: TBD
- Branch: TBD
- PR: TBD

### Why

The pnpm conversion disabled strict peer checks and exotic subdependency
blocking to land incrementally. Re-enabling both is one coherent PR because
both settings turn install-time dependency risk into explicit failures.

### Dependencies

- The known `@zk-email/relayer-utils` path to `node-pre-gyp-github` via git ref
  must be removed, replaced, or explicitly justified before
  `blockExoticSubdeps` can be enabled.
- MT-1 should remove the blur-effect peer workaround first if that warning is
  still present.

### Scope

- Set `strictPeerDependencies: true`.
- Re-enable `blockExoticSubdeps`.
- Fix or explicitly declare missing peer dependencies surfaced by the install.
- Document any remaining exception with owner and removal condition.

### Out of Scope

- Isolated linker migration.
- Broad dependency upgrades unrelated to strictness failures.
- Dedupe-only lockfile churn.

### Validation

```bash
pnpm install --frozen-lockfile
pnpm --filter @selfxyz/mobile-app test
pnpm types
```

Additional checks:

- Install output contains no unresolved peer warnings.
- Any exotic subdependency exception has a tracked upstream/removal path.

### Files Modified

| File                             | Change                                                 |
| -------------------------------- | ------------------------------------------------------ |
| `pnpm-workspace.yaml` / `.npmrc` | Enable strict peer and exotic-subdependency checks.    |
| Workspace `package.json` files   | Add missing direct peer declarations surfaced by pnpm. |
| `pnpm-lock.yaml`                 | Reflect any declared dependency changes.               |

### Definition of Done

- [ ] `pnpm install --frozen-lockfile` passes with strict peer checks enabled.
- [ ] Exotic subdependency blocking is enabled or the only exception is
      documented with an owner and removal condition.
- [ ] Mobile app tests and repo typecheck pass.
