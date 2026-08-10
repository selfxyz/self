## Migrate root scripts to `turbo run`

> Last updated: 2026-05-13
> Status: Archived 2026-08-06 - landed in #2186/#2188

- Workstream: monorepo-tooling
- Backlog IDs: MT-4
- Owner: Justin Hernandez
- Branch: justin/mt-3-and-4
- PR: TBD (shipped together with MT-3)

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
- 2026-06-17: Implemented alongside MT-3 (one PR). Root `build`/`types`/`test`/
  `lint` now drive Turbo. Deviations from the plan's "bare `turbo run <task>`"
  mapping, all to preserve pre-Turbo semantics:
  - **Exclusions are required.** The pre-Turbo scripts carried `--filter "!..."`
    scopes that must survive: `build` excludes contracts/circuits/mobile-sdk-demo/
    kmp-sdk/kmp-sdk-test-app; `types` excludes contracts/common/mobile-app.
    Turbo has no "exclude package from a task" field in `turbo.json` (selection
    is CLI-only), so the lists live in a new `scripts/turbo-tasks.cjs` wrapper
    (matches the "complex logic belongs in `scripts/*.cjs`" invariant and keeps
    root scripts thin). Root scripts call `node scripts/turbo-tasks.cjs <task>`.
  - `lint` keeps its prefix steps: `lint:pnpm-version`, `lint:ci-sentinel`, and
    `lint:headers` run before the turbo fan-out, unchanged.
  - **`format` is NOT migrated.** Unlike the plan's table, the root `format`
    script was never a `pnpm -r` fan-out — it is `node scripts/format-monorepo.cjs`,
    a bespoke orchestrator that sets `SKIP_BUILD_DEPS`/`GRADLE_USER_HOME` and
    sequences gradle (kmp) + swift (native-shell) formatting. The invariant says
    such logic stays in `scripts/*.cjs`, and SPEC out-of-scope forbids gradle/
    swift through Turbo. Kept as-is. (`format` is still defined in `turbo.json`
    per MT-3 for JS-only use, but `pnpm format` remains the canonical entrypoint.)
  - **Behavior change to flag for MT-5/CI:** `pnpm test` and `pnpm lint` no longer
    run the Gradle kmp packages (`@selfxyz/kmp-sdk`, `@selfxyz/kmp-sdk-test-app`)
    — SPEC out-of-scope keeps gradle out of Turbo and those are JS-task no-ops/
    heavy gradle. They remain covered by the dedicated `kmp:test`/`kmp:lint`
    (and `native-shell:*`) scripts. The CI migration (MT-5) must invoke kmp
    coverage explicitly rather than relying on bare `pnpm test`/`pnpm lint`.
  - Validation: `pnpm build` (cold → warm FULL TURBO 11/11), `pnpm types`,
    `pnpm lint` all green; RN gate `pnpm --filter @selfxyz/mobile-app test`
    70 pass / 0 fail.
