---
name: pr-audit
description: Multi-agent PR review — component, integration, and routing analysis merged into a structured audit doc with severity and PR buckets.
disable-model-invocation: false
user-invocable: true
argument-hint: '[base-branch (default: dev)]'
---

# PR Audit

You run a multi-pass review of the current branch, pull in external PR feedback, and produce a structured audit document with findings grouped into PR-sized fix buckets.

This skill **stops at the audit doc**. It does not create issues or specs — use `/gaps-to-issues` and `/spec-from-audit` for those steps.

## Input

`$ARGUMENTS` — Optional base branch name (default: `dev`).

## Workflow

### Step 1: Gather the Diff

Use `$ARGUMENTS` if provided, otherwise default to `dev`.

Verify the base branch exists:

```bash
git rev-parse --verify <base-branch>
```

If it does not exist, ask the user which branch to diff against.

Gather the full diff and context:

```bash
git log <base-branch>..HEAD --oneline --no-decorate
git diff <base-branch>...HEAD --stat
git diff <base-branch>...HEAD
git diff <base-branch>...HEAD --name-only
git status -s
```

Read the full diff carefully. You will reference it throughout the review passes.

### Step 2: Multi-Agent Review (3 Parallel Passes)

Run all three review passes **in parallel** using the Agent tool. Each agent receives the diff context and reviews through a specific lens.

#### Pass A: Component-Level Review

For every new or changed screen/component file, check:

- Missing or incorrect imports (especially cross-package imports that don't resolve)
- Wrong or missing props vs the component's actual interface — read the component definition, don't guess
- Missing Lottie/animation assets or props that the component supports but aren't passed
- Placeholder logic left in production code (hardcoded values, no-op callbacks, `TODO`/`FIXME`)
- Missing error/loading/empty states
- Raw hex colors instead of design tokens
- Files exceeding 800 LOC

#### Pass B: Integration-Level Review

For the full set of changed files, check:

- Provider/contract flow violations — does data flow match what specs define?
- State propagation between screens — is state passed correctly through navigation, or lost on refresh/direct-entry?
- Persistence gaps — state that should survive reload but only lives in `useState`
- Event ordering issues — race conditions, guards that swallow later events
- Breaking changes to shared interfaces consumed by other packages
- Build-time vs runtime config that should be dynamic

#### Pass C: Route Wiring Review

For all navigation-related changes, check:

- Every `navigate()` / `push()` / `replace()` target has a corresponding route definition
- Every new route definition is reachable from at least one navigation call
- Orphaned routes — defined but unreachable
- Screens that receive `location.state` but have no guard for direct-entry (missing state)
- Deep link configuration consistency (if applicable)

### Step 3: Pull in PR Feedback

Check if a PR exists for this branch:

```bash
gh pr view --json number,url 2>/dev/null
```

If a PR exists, fetch external review comments:

```bash
gh api repos/{owner}/{repo}/pulls/{number}/comments --paginate
gh api repos/{owner}/{repo}/pulls/{number}/reviews --paginate
gh api repos/{owner}/{repo}/issues/{number}/comments --paginate
```

Extract actionable items from CodeRabbit, Codex, and human reviewers. Ignore resolved conversations and pure acknowledgment comments.

If no PR exists, skip this step.

### Step 4: Merge and Deduplicate

Combine findings from all three passes and PR feedback. Deduplicate — if Pass A and a CodeRabbit comment flag the same issue, keep one entry and note both sources.

Assign severity:

| Severity | Criteria |
|----------|----------|
| **Critical** | Build-breaking, crashes, data loss, security holes, blocked user flows |
| **High** | Incorrect behavior visible to users, contract violations, missing error handling on critical paths |
| **Medium** | Missing states, prop mismatches, design token violations, placeholder logic |
| **Low** | Style, minor code quality, non-blocking TODOs |

### Step 5: Group into PR-Sized Buckets

Group findings into fix buckets. Each bucket:

- Targets ≤2,000 LOC changed
- Groups related findings touching the same files or logical area
- Is independently mergeable (note dependencies if unavoidable)
- Has a clear name, estimated LOC, list of files, and acceptance criteria

### Step 6: Write the Audit Document

Determine the branch slug from the current branch name (strip `feat/`, `fix/`, etc., replace `/` with `-`).

Create the audit document at:

```
docs/reviews/YYYY-MM-DD-<branch-slug>-audit.md
```

Create `docs/reviews/` if it does not exist.

Structure:

```markdown
# PR Audit — <branch-name>

> Date: YYYY-MM-DD
> Branch: `<branch-name>`
> Base: `<base-branch>`
> PR: #NNN (if exists)
> Reviewers: Claude Code (component, integration, routing passes), [external reviewers]
> Status: Audit complete — ready for review

## Summary

[2-3 sentences describing what the branch does and the overall health assessment.]

## Findings

### Critical

- [ ] [finding] — `path/to/file.ts:NN`
  - **Source:** [Pass A | Pass B | Pass C | CodeRabbit | reviewer]
  - **Fix:** [concrete action]

### High

- [ ] ...

### Medium

- [ ] ...

### Low

- [ ] ...

## PR Buckets

### Bucket 1: [name]
- **Estimated LOC:** ~NNN
- **Findings:** #1, #3, #7
- **Files:** [list]
- **Dependencies:** [none | Bucket N must land first]
- **Acceptance criteria:**
  - [ ] [criterion]

### Bucket 2: [name]
...

## What Works Well

[List things the branch does correctly — not just problems.]
```

### Step 7: Present to User

Show the user:

1. Total finding count by severity
2. Each bucket with name, estimated LOC, and findings covered
3. Any findings that didn't fit cleanly into a bucket

Tell the user:

> "Audit complete. Review the findings and buckets above. When ready, use `/gaps-to-issues` to create Linear issues from these buckets, then `/spec-from-audit` to generate specs."

**Stop here.** Do not create issues or specs.

## Important Notes

- Never run `git commit` or `git push`. Stage the audit doc but stop there.
- Read the full diff — do not summarize from file names alone.
- Findings must be specific and actionable with file paths and line numbers.
- When estimating LOC for buckets, be conservative.
- If the diff is very large (>10k LOC), warn the user and suggest focusing on critical/high only.
