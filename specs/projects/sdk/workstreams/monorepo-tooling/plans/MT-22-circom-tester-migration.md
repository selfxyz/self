## Migrate circuits tests to upstream `circom_tester@0.0.24`

> Last updated: 2026-08-06
> Status: Open - circuits-owned, gates MT-9

- Workstream: monorepo-tooling
- Backlog IDs: MT-22
- Owner: circuits owner (Ayman)
- Branch: TBD
- PR: TBD

### Notes for the circuits owner (added 2026-08-06, not acted on)

Two findings from a docs-only audit. Both are recorded rather than fixed,
because circuits is outside the auditor's scope — decide and act as owner.

1. **`circuits/package.json:67` pins `circom_tester` to a floating branch:**
   `github:remicolin/circom_tester#main`. The `pnpm-workspace.yaml` override
   pins sha `81e963cea5fb91ca31126058c8fdc9aafc9d695d` and wins for resolution,
   so installs are deterministic today. But the floating ref contradicts the
   repo's `minimumReleaseAge` supply-chain posture and silently becomes live if
   that override is ever dropped — including by this plan's own step that removes
   it. If MT-22 is not done soon, consider pinning the workspace entry to the
   same sha as an interim measure.
2. **This plan's "Files Modified" table is stale.** It says the fork override
   lives in root `package.json`. It is in `pnpm-workspace.yaml` — pnpm 11 reads
   workspace settings from that file and ignores the root `pnpm` field entirely.
   `blockExoticSubdeps: false` is set in **both** `pnpm-workspace.yaml` and
   `.npmrc`; both need reverting for MT-9, not just one.

MT-22 is the last blocker for MT-9. `strictPeerDependencies` and
`blockExoticSubdeps` are both still `false` solely because of the `github:` ref.

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
