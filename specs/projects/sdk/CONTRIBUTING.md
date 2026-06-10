# Contributing — SDK Specs & Planning Workflow

The full process for planning and shipping SDK work (`packages/`, `webview-app`, `webview-bridge`). The root `CLAUDE.md`/`AGENTS.md` hold the invariants; this is the workflow.

## Where Specs Live

- **Execution specs** → `specs/projects/sdk/workstreams/<scope>/plans/<ID>-<slug>.md` — version-controlled, agent-executable plans (the **how**: paths, code, fire sites).
- **Backlog** → `specs/projects/sdk/workstreams/<scope>/SPEC.md` — durable context + backlog (the **what**: events, invariants, branch models).
- **Architecture context** → `specs/projects/sdk/OVERVIEW.md`.
- **Audit docs** → `docs/reviews/`.
- **Linear issues** track and surface work; link to the repo spec and attach a Linear document copy for non-GitHub reviewers.

## Spec Naming & Structure

- **Context-first, doc-type names** (`INDEX.md`, `OVERVIEW.md`, `SPEC.md`, `PLAN.md`); don't repeat project prefixes already in folder context. Use descriptive link labels — `[SDK Overview](./OVERVIEW.md)`, not `[OVERVIEW.md](./OVERVIEW.md)`.
- **No singleton/one-file folders.** Don't create a folder to hold one markdown file.
- **Workstream names are fixed.** Under `workstreams/<scope>/`: `SPEC.md` (context + implementation); `SPEC-<TOPIC>.md` only when multiple impl specs are needed.
- **Two-layer model.** `INDEX.md` = navigation; `OVERVIEW.md` = stable project context. Workstream `SPEC.md` = durable contract + backlog (the **what**). PR execution → `plans/<BACKLOG-ID>-<slug>.md` (the **how**). Paused workstreams: `specs/projects/sdk/paused/<scope>/`.
- `SPEC.md` stays scannable (100–200 lines, no paths/code). Cancelled items → `Cancelled` section; IDs never reused.
- If renaming/moving specs, update references in `specs/`, `AGENTS.md`, and `CLAUDE.md` in the same change.

## Planning Protocol

1. Read `CLAUDE.md` Key Rules + the relevant workstream `SPEC.md` before implementing.
2. Create/locate the Linear issue — scope, files modified, acceptance criteria.
3. Write the spec (backlog row in `SPEC.md`, execution plan in `plans/`).
4. Attach a Linear document copy.
5. Implement — one spec = one PR (see PR size in Key Rules).
6. On completion: update Linear status via `save_issue` (status field only), summarize in a `save_comment` linking the PR, close when done.

## Spec-Writing Guidelines

Specs are agent-executable prompts — a fresh session with no context must produce a correct PR.

- **Decisions, not options.** "Use local wrappers", not "consider X or Y."
- **Second person.** "You are fixing X."
- **Explicit constraints + out-of-scope section** (as important as in-scope). "You will NOT modify…"
- **Exact paths + line numbers.** `src/utils/kycProvider.ts:118`.
- **State the validation command** — agents run it; omit it and they skip validation.
- **Mark items required vs optional.**
- **Qualify coverage precisely.** "Tested" = handler-level integration tests pass end-to-end; if only parsers/utils are tested, say so.
- **Flag invariant departures.** If an approach conflicts with a rule in `CLAUDE.md`/`OVERVIEW.md`/sibling `SPEC.md`, call it out, justify it, list parent docs to update.
- **Use `--remote` for medium+ work** so it continues in the background.

## Audit Pipeline Skills

Run in sequence with review pauses:

1. **`/pr-audit`** — multi-agent review (component + integration + routing) → audit doc in `docs/reviews/`.
2. **`/gaps-to-issues`** — Linear issues from audit PR buckets.
3. **`/spec-from-audit`** — one agent-executable spec per issue (repo file + Linear document).
