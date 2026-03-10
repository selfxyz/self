# Spec Execution Model

> Last updated: 2026-03-10
> Purpose: Keep stable context separate from PR execution so agents do not lose track of work.

## Why This Exists

The repo has repeatedly hit the same failure mode:

- person-based specs preserve ownership but blur cross-cutting changes
- giant all-in-one specs preserve context but overflow execution context
- session-only plans disappear on API errors, context pressure, or `/clear`

The fix is a two-layer model:

1. **Stable context** lives in `INDEX.md`, `OVERVIEW.md`, and workstream `SPEC.md`
2. **PR execution** lives in a plan file under `workstreams/<scope>/plans/`

This matches the repo rule that each chunk should be its own PR, while keeping architecture and backlog durable.

## File Roles

| File                                                                  | Role                                                                          | Changes How Often |
| --------------------------------------------------------------------- | ----------------------------------------------------------------------------- | ----------------- |
| `specs/README.md`                                                     | Global navigation and reading order                                           | Rarely            |
| `projects/<project>/INDEX.md`                                         | Project entrypoint and workstream links                                       | Rarely            |
| `projects/<project>/OVERVIEW.md`                                      | Architecture, shared contracts, global status                                 | Occasionally      |
| `projects/<project>/workstreams/<scope>/SPEC.md`                      | Durable workstream context, invariants, ownership, backlog, active plan index | Regularly         |
| `projects/<project>/workstreams/<scope>/plans/<BACKLOG-ID>-<slug>.md` | One PR-sized execution plan and status log                                    | Per PR            |

## Canonical Structure

```text
specs/projects/<project>/
  INDEX.md
  OVERVIEW.md
  workstreams/
    <scope>/
      SPEC.md
      CONTRACTS.md        # only if bridge/native contract heavy
      HANDOFF.md          # only if needed
      plans/
        <BACKLOG-ID>-<slug>.md
```

## Rules

1. **One PR maps to one plan file.**
2. **Every plan file maps to at least one backlog ID in the parent `SPEC.md`.**
3. **Do not put PR-by-PR execution detail in `OVERVIEW.md`.**
4. **Do not create a new top-level spec when a plan file under an existing workstream is enough.**
5. **When a PR merges, update the plan status and the backlog row in the same change.**
6. **If a task spans multiple workstreams, pick one lead workstream plan and link dependent backlog IDs instead of duplicating execution detail.**

## Workstream `SPEC.md` Layout

Each active workstream `SPEC.md` should contain these sections near the top:

1. Purpose
2. Scope
3. Out of Scope
4. Invariants
5. Ownership Boundaries
6. Dependencies
7. Backlog
8. Active Plans
9. Completion Checklist

The rest of the file may hold reference implementation notes, legacy chunk details, or deeper technical guidance, but the backlog and active plan index are the operational source of truth.

## Backlog Format

Use stable IDs. Do not renumber them after merge.

| ID    | Title                          | Status | Priority | Depends On | Plan                                        | PR  |
| ----- | ------------------------------ | ------ | -------- | ---------- | ------------------------------------------- | --- |
| NS-01 | Physical-device NFC validation | Ready  | High     | -          | `plans/NS-01-physical-device-validation.md` | TBD |

Allowed statuses:

- `Ready`
- `In Progress`
- `Blocked`
- `Deferred`
- `Done`

Avoid ambiguous status labels like `Partial` in backlog rows. If work is partially complete, split it into child IDs or use a checklist inside the plan file.

## Plan File Format

Each plan file must be self-contained enough that an agent can execute it without rereading the entire repo.

Naming rule:

- Use stable backlog-ID filenames, not dates.
- Format: `<BACKLOG-ID>-<slug>.md`
- Example: `NS-01-physical-device-validation.md`

Required sections:

- Workstream
- Backlog IDs
- Status
- Owner
- Branch / PR
- Why
- Scope
- Out of Scope
- Files to Modify
- Files Not to Modify
- Preconditions
- Implementation Notes
- Validation
- Definition of Done
- Status Log

## Refactoring Existing Specs

When converting an older spec to this model:

1. Keep `OVERVIEW.md` stable unless architecture changed.
2. Keep the existing `SPEC.md` file path.
3. Add the backlog and active plans sections near the top of `SPEC.md`.
4. Move only PR-sized execution detail into `plans/`.
5. Keep deep implementation context in `SPEC.md` if it is still useful reference material.
6. If a topic doc contains actionable work, move the action items into owning workstream backlog rows and leave the topic doc as context only.
7. Archive stale initiative docs that conflict with the active structure.

## Migration Checklist

- [ ] Stable workstream `SPEC.md` has backlog IDs
- [ ] Open work has plan files under `plans/`
- [ ] Plan files are linked from `SPEC.md`
- [ ] Topic docs no longer act as the only tracker for actionable work
- [ ] `README.md`, `AGENTS.md`, and `CLAUDE.md` point to the same execution model

## Anti-Patterns

- giant `SPEC.md` files used as both architecture doc and day-by-day work log
- separate person-based specs for changes that cut across packages
- topic docs that become the only place open work is tracked
- session transcripts treated as the plan
- merged PRs without corresponding spec status updates
