---
name: spec-from-audit
description: Generate one spec per issue — repo file (canonical) + Linear document (mirror). Agent-executable implementation plans with file paths, validation commands, and acceptance criteria.
disable-model-invocation: false
user-invocable: true
argument-hint: '[issue IDs or path-to-audit-doc]'
---

# Spec from Audit

You take Linear issues (created by `/gaps-to-issues`) and generate one spec per issue. Each spec is written to the repo (`specs/`) as the canonical version, then mirrored to a Linear document for cross-tool access. A new Claude Code session with no prior context should be able to pick up the repo spec and produce a correct PR.

## Input

`$ARGUMENTS` — Either:
- A list of Linear issue IDs (e.g., `SELF-2357 SELF-2358 SELF-2359`)
- A path to an audit doc that has a "Follow-up Issues" section

If not provided, look for the most recently modified audit doc in `docs/reviews/` and extract issue IDs from it.

## Workflow

### Step 1: Gather Issue Context

For each issue ID, fetch the issue details:

- Use `mcp__linear-server__get_issue` to read the title, description, and acceptance criteria
- If an audit doc path is available, read the full audit doc for additional context on findings

### Step 2: Read the Codebase

For each issue, read the files referenced in its description/scope. You need to understand the **current state** of the code to write accurate specs with line numbers.

Do not guess file contents — read them. Specs with wrong line numbers or stale code references are worse than no spec.

### Step 3: Generate Specs

For each issue, write the spec to **both** locations:

1. **Repo file** — Write to `specs/projects/sdk/workstreams/<scope>/plans/<ID>-<slug>.md` using the Write tool. Determine `<scope>` from the workstream the issue belongs to (e.g., `webview`, `sdk-core`, `build-pipeline`). Always create or update the backlog row in the workstream's `SPEC.md` — if `SPEC.md` doesn't exist yet, create it.
2. **Linear document** — Create using `mcp__linear-server__create_document`, linked to the **issue** (not the project). This is the cross-tool access copy.

**Title format:** `SPEC: <issue title>`

**Spec structure:**

```markdown
## Overview

You are [doing what] in [which area]. [1-2 sentences on why this matters.]

## Preconditions

- [What must be true before starting — dependencies on other PRs, packages published, etc.]

## [Problem 1 / Area 1]: [descriptive name]

**File:** `path/to/file.ts`

[Description of the current problem with exact line numbers.]

### Fix

[Step-by-step instructions. Be explicit about what to change and why.]

## [Problem 2 / Area 2]: [descriptive name]

...

## Files to modify

- `path/to/file.ts` — [what changes]
- `path/to/other.ts` — [what changes]

## Files NOT to modify

- `path/to/untouched/` — [why]

## Dependencies

- [Other issues/PRs that must land first, if any]

## Validation

```bash
[relevant validation commands from the repo]
```

## Definition of Done

- [ ] [acceptance criterion from the issue]
- [ ] [acceptance criterion]
- [ ] All validation commands pass
```

### Spec-Writing Rules

The cardinal rule: **if two reasonable engineers could implement different solutions from the same spec, the spec is too open.** Specs must contain decisions, not options.

Follow these strictly:

1. **Decisions, not options** — "Use local wrappers" not "Consider adding to Euclid or using local wrappers." Every ambiguous implementation choice must be resolved in the spec. If you genuinely can't decide, flag it as a blocker and ask the user — don't embed it as an option.
2. **Second person** — "You are fixing...", "You will modify..."
3. **Exact file paths with line numbers** — `src/utils/kycProvider.ts:118`, not "the provider file"
4. **Current code, not stale references** — you read the files in Step 2, use what you actually saw
5. **Explicit constraints** — "You will NOT modify..." sections prevent scope creep
6. **Required vs optional** — mark every item. Don't let agents infer priority.
7. **Validation command** — agents will run it. If it's not there, they'll skip validation.
8. **One spec = one PR ≤2k LOC** — if a spec feels like it would produce >2k LOC, flag it and suggest splitting
9. **Self-contained** — the spec must include enough context to execute without reading other specs or the full audit doc

Every spec should follow this structure:
1. State the goal in one sentence
2. List decisions already made
3. Define scope and out-of-scope
4. Name the files to modify
5. Define done criteria in behavior terms

### Step 4: Present Results

Show the user:

1. Table of created specs with issue IDs and document URLs
2. Any issues that were too complex and need manual spec-writing
3. Any issues where codebase reading revealed the problem is already fixed or different than described

**Stop here.**

## Important Notes

- Never run `git commit` or `git push`.
- Always read the actual files before writing specs — stale line numbers are actively harmful.
- If an issue references files that don't exist, flag it rather than guessing.
- If you discover the issue description is wrong (e.g., the code was already fixed), note this and ask the user whether to still create the spec. If the user wants the issue updated, add a **comment** via `save_comment` explaining what changed — never overwrite the issue description.
- Specs are for agents, not humans. Write them as precise instructions, not explanatory documents.
- The spec is the source of truth, not the issue body. Issue bodies are lightweight pointers — the spec must be fully self-contained. Do not assume the agent has read the issue description.
- The repo file (`specs/`) is the canonical version. The Linear document is a copy for cross-tool access. Both should have identical content.
- Link Linear documents to issues (not projects). Use `mcp__linear-server__create_document` with the `issue` parameter.
- **Never overwrite issue descriptions.** Use `save_comment` for all updates, corrections, and status notes. Use `save_issue` only to change structured fields (status, priority, assignee).
