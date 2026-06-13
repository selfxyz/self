## Migrate root scripts to `turbo run`

> Last updated: 2026-05-13
> Status: Draft

- Workstream: monorepo-tooling
- Backlog IDs: MT-4
- Owner: TBD
- Branch: TBD
- PR: TBD

### Why

Once `turbo.json` exists (MT-3), root `package.json` scripts should
drive Turbo instead of re-implementing fan-out via
`pnpm -r --if-present`. This eliminates duplicate ordering logic and
gives every contributor cache hits locally.

### Dependencies

- **MT-3 must land first.** This plan assumes `turbo.json` is already
  in place and Gate validation from MT-3 has passed.

### Scope

- Replace the root `build`, `lint`, `types`, `test`, `format` script
  entries in `package.json` with `turbo run <task>` invocations.
- Preserve any non-Turbo orchestration scripts (e.g. release scripts,
  one-off `scripts/*.sh` invocations) unchanged.
- Keep developer ergonomics: a bare `pnpm build` must still work
  identically to today's, just faster on cache hits.

### Out of Scope

- Adding or removing tasks from `turbo.json` (MT-3 owns the pipeline
  shape).
- CI workflow changes (MT-5).
- Per-workspace script renames or refactors.

### Concrete Mapping

| Current root script                      | After              |
| ---------------------------------------- | ------------------ |
| `build` → `pnpm -r --if-present build`   | `turbo run build`  |
| `lint` → `pnpm -r --if-present lint`     | `turbo run lint`   |
| `types` → `pnpm -r --if-present types`   | `turbo run types`  |
| `test` → `pnpm -r --if-present test`     | `turbo run test`   |
| `format` → `pnpm -r --if-present format` | `turbo run format` |

Exact pre-change names should be confirmed against `package.json` at
implementation time; the table is illustrative.

### Validation

```bash
# Clean state
pnpm install --frozen-lockfile

# Each script still works
pnpm build
pnpm lint
pnpm types
pnpm test
pnpm format

# Cache works across script invocations
pnpm build   # cold
pnpm build   # hot — should report FULL TURBO
```

Additionally:

- `pnpm --filter @selfxyz/mobile-app test` still passes (RN regression
  gate from SPEC.md).
- Spot-check that any developer-facing docs (`README`, `CLAUDE.md`,
  `AGENTS.md`) referencing these scripts still describe accurate
  behavior. If a doc mentions `pnpm -r` explicitly, update it.

### Files Modified

| File           | Change                                 |
| -------------- | -------------------------------------- |
| `package.json` | Replace script bodies with `turbo run` |

### Files NOT Modified

- `turbo.json` — MT-3 territory.
- `.github/workflows/*.yml` — MT-5 territory.
- Per-workspace `package.json` files.

### Definition of Done

- [ ] Root `build`, `lint`, `types`, `test`, `format` call `turbo run`.
- [ ] Bare `pnpm build` / `pnpm test` etc. work end-to-end.
- [ ] Warm second run hits Turbo cache.
- [ ] RN regression gate passes.
- [ ] Docs referencing replaced scripts are updated.

### Estimated PR Size

<50 LOC. Trivial diff, but tighten review on caching behavior.

### Status Log

- 2026-05-13: Plan created.
