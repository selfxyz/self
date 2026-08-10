## Pin `circom_tester` for circuits tests

> Last updated: 2026-05-20
> Status: Archived 2026-08-06 - pin landed and is still active in
> `pnpm-workspace.yaml`; MT-22 removes it

- Workstream: monorepo-tooling
- Backlog IDs: MT-21
- Owner: TBD
- Branch: TBD
- PR: TBD

### Why

Under pnpm hoisting, `circom-dl` can resolve its transitive
`circom_tester@0.0.20` from the npm registry. Current circuits tests rely on
the remicolin fork API at commit `81e963cea5fb91ca31126058c8fdc9aafc9d695d`,
which exposes `getOutput(witness, string[])`. MT-21 stabilizes CI until MT-22
migrates to upstream `0.0.24`.

### Scope

- Force all `circom_tester` resolution paths to the remicolin fork commit via
  pnpm override.
- Ensure the direct circuits dependency and the `circom-dl` transitive
  dependency resolve to the same Git tarball.
- Keep circuits tests importing `circom_tester` directly for this temporary
  state.

### Out of Scope

- Migrating test code to upstream `circom_tester@0.0.24`; MT-22 owns that.
- Introducing or retaining a compatibility shim as the final shape.
- Changing circuit behavior.

### Validation

```bash
pnpm install --frozen-lockfile
pnpm why circom_tester
pnpm --filter @selfxyz/circuits test
```

Additional checks:

- `pnpm why circom_tester` reports one resolved version.
- `pnpm-lock.yaml` maps all `circom_tester` paths to the remicolin Git tarball
  at `81e963cea5fb91ca31126058c8fdc9aafc9d695d`.
- The registry `circom_tester@0.0.20` package is absent from the lockfile.

### Files Modified

| File                    | Change                                                    |
| ----------------------- | --------------------------------------------------------- |
| `package.json`          | Add or adjust pnpm override for `circom_tester`.          |
| `circuits/package.json` | Keep direct dependency aligned with the override.         |
| `pnpm-lock.yaml`        | Resolve direct and transitive entries to the Git tarball. |

### Definition of Done

- [ ] One `circom_tester` version resolves across the repo.
- [ ] Circuits tests pass in CI with the fork pin.
- [ ] PR states that MT-22 is required before removing the override.
