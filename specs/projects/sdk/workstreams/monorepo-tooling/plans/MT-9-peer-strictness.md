## Re-enable pnpm peer and exotic-subdependency strictness

> Last updated: 2026-08-06
> Status: Partially blocked - `blockExoticSubdeps` waits on MT-22;
> `strictPeerDependencies` is unmeasured

**Blockers as of 2026-08-06.** The two flags have different blockers and should
be validated separately:

- `blockExoticSubdeps` is blocked by `circom_tester` resolving to a `github:`
  ref (MT-22). The `node-pre-gyp-github` path is **resolved** — registry
  `1.4.4` via `pnpm-workspace.yaml` `overrides` — so it is no longer a blocker.
- `strictPeerDependencies` has **no confirmed blocker**. The exotic ref does not
  gate it. Flip it on a scratch branch, run `pnpm install`, and record the actual
  peer failures before assuming MT-22 gates this half.

Both flags are set in two places — `pnpm-workspace.yaml` **and** `.npmrc` — so
both files need reverting.

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

- MT-22 must land before `blockExoticSubdeps` can be enabled. (The
  `@zk-email/relayer-utils` → `node-pre-gyp-github` git-ref path that was
  previously listed here is resolved by the registry `1.4.4` override.)
- MT-1 should remove the blur-effect peer workaround first if that warning is
  still present.
- `strictPeerDependencies` depends on the measured peer-failure list, not on
  MT-22 — take that measurement first so this half is not held behind circuits.

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
