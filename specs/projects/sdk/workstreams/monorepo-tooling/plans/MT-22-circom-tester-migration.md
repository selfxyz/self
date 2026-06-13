## Migrate circuits tests to upstream `circom_tester@0.0.24`

> Last updated: 2026-05-20
> Status: Draft

- Workstream: monorepo-tooling
- Backlog IDs: MT-22
- Owner: TBD
- Branch: TBD
- PR: TBD

### Why

MT-21 is a temporary fork pin. The durable fix is to migrate circuits tests away
from the fork-only string-list `getOutput(witness, ["signal"])` API and use the
upstream `circom_tester@0.0.24` output-schema API.

### Dependencies

- MT-21 should land first if circuits CI is red under pnpm.
- Confirm upstream `circom_tester@0.0.24` exposes stable behavior for every
  circuit test touched by this migration.

### Scope

- Replace fork-only `getOutput(witness, string[])` calls in circuits tests with
  upstream-compatible output-schema usage.
- Normalize witness value assertions, including bigint-to-string comparisons
  where current tests assert against strings.
- Remove the MT-21 `pnpm.overrides.circom_tester` fork pin.
- Add a `pretest` guard that fails fast unless `circom_tester` resolves to
  `0.0.24`.
- Delete any interim `circuits/tests/utils/circomTesterCompat.ts` shim if it is
  still present.

### Out of Scope

- Changing circuit constraints or generated artifacts.
- Broad test rewrites unrelated to the API migration.
- Keeping both fork and upstream APIs supported long term.

### Validation

```bash
pnpm install --frozen-lockfile
pnpm why circom_tester
pnpm --filter @selfxyz/circuits test
```

Additional checks:

- `pnpm why circom_tester` resolves to upstream `0.0.24`, not the remicolin
  fork and not registry `0.0.20`.
- The pretest guard fails locally if `circom_tester` resolves to another
  version.
- CI circuits tests pass without the fork override.

### Files Modified

| File                                         | Change                                     |
| -------------------------------------------- | ------------------------------------------ |
| `circuits/tests/**/*.ts`                     | Migrate `getOutput` usage and assertions.  |
| `circuits/package.json`                      | Pin/guard upstream `circom_tester@0.0.24`. |
| `package.json`                               | Remove root pnpm override for the fork.    |
| `pnpm-lock.yaml`                             | Resolve to upstream `0.0.24`.              |
| `circuits/tests/utils/circomTesterCompat.ts` | Delete if still present.                   |

### Definition of Done

- [ ] Fork-only API usage is gone.
- [ ] Fork override is removed.
- [ ] Pretest guard enforces upstream `0.0.24`.
- [ ] Circuits test suite passes in CI.
