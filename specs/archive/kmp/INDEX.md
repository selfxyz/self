# KMP Specs Index

Last updated: March 5, 2026
Owner: KMP program
Status: Archived

This folder is a historical snapshot. Active execution moved to SDK specs.

## Start Here

1. [KMP Initiative](./INITIATIVE.md) — goals, scope, milestones.
2. [KMP Architecture](./ARCHITECTURE.md) — technical boundaries and runtime model.
3. [KMP Reorg Plan](./REORG-PLAN.md) — migration phases and execution checklist.

## Historical Paths (Retired)

- `specs/projects/kmp/INITIATIVE.md`
- `specs/projects/kmp/ARCHITECTURE.md`
- `specs/projects/kmp/REORG-PLAN.md`

## Active Paths

- `specs/projects/sdk/OVERVIEW.md` (SDK-wide execution status — see "Execution Status" section)
- `specs/projects/sdk/paused/native-shells/` (paused KMP execution stream retained for reuse)
- `specs/projects/sdk/paused/integrations/` (paused cross-SDK integration execution)

## Notes

- Keep this folder as immutable historical context.
- For new KMP work, update SDK specs under `specs/projects/sdk/`.

## Migration Tracking

- [x] Reorg plan created
- [x] Architecture skeleton created
- [x] Initiative skeleton created
- [x] Status moved to `specs/projects/sdk/OVERVIEW.md` "Execution Status" section (relocated — SDK-wide)
- [x] KMP execution location clarified — active work under `specs/projects/sdk/workstreams/*`, paused native tracks under `specs/projects/sdk/paused/*`
- [x] Legacy path mapping added to top-level `specs/README.md`

## Change Log

- 2026-03-05: Initial KMP spec index skeleton created.
- 2026-03-05: Removed stale planned `specs/projects/kmp/workstreams/` target; confirmed active execution remains under `specs/projects/sdk/workstreams/*`.
- 2026-03-11: KMP-retained native tracks moved to `specs/projects/sdk/paused/*`.
