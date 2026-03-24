---
name: gaps-to-issues
description: Create Linear issues from a PR audit doc — one issue per PR bucket with acceptance criteria and linked audit findings.
disable-model-invocation: false
user-invocable: true
argument-hint: '[path-to-audit-doc]'
---

# Gaps to Issues

You take a PR audit document (produced by `/pr-audit`) and create Linear issues from its PR buckets.

This skill **stops at issue creation**. Use `/spec-from-audit` to generate specs for the created issues.

## Input

`$ARGUMENTS` — Path to the audit document (e.g., `docs/reviews/2026-03-23-branch-audit.md`). If not provided, look for the most recently modified file in `docs/reviews/`.

## Workflow

### Step 1: Read the Audit Document

Read the audit doc. Verify it has:

- A "PR Buckets" section with at least one bucket
- Each bucket has: name, estimated LOC, findings, files, acceptance criteria

If the audit doc is missing buckets or acceptance criteria, tell the user and stop.

### Step 2: Ask for Linear Context

Ask the user:

1. Which **Linear team** to create issues under (suggest the team from recent issues if detectable)
2. Which **Linear project** to add issues to (optional)
3. Whether to set **priority** per bucket or use a default
4. Whether to **consolidate** any buckets before creating issues

Wait for confirmation before proceeding.

### Step 3: Create Issues

For each bucket, create a Linear issue using `mcp__linear-server__save_issue`:

- **Title:** Bucket name (concise, under 70 characters)
- **Team:** From Step 2
- **Project:** From Step 2 (if provided)
- **Priority:** Based on the highest severity finding in the bucket:
  - Contains Critical findings → Urgent (1)
  - Contains High findings → High (2)
  - Contains Medium findings → Medium (3)
  - Contains only Low findings → Low (4)
- **Description:** Keep it lightweight — the spec (created later by `/spec-from-audit`) is the source of truth. The issue body should contain:
  - One-sentence goal
  - List of finding IDs from the audit (e.g., "Covers findings #1, #3, #7")
  - Dependencies on other issues if any
  - A note: "See attached spec document for full implementation plan."
  - Do NOT duplicate scope, file lists, or acceptance criteria — that belongs in the spec
- **Links:** Add the PR URL if one exists

If the user asked to consolidate buckets, merge the relevant findings.

### Step 4: Update the Audit Document

Add a "Follow-up Issues" section to the top of the audit doc (below the header metadata) with a table of all created issues:

```markdown
## Follow-up Issues

| Issue | Priority | Title |
|-------|----------|-------|
| [SELF-NNNN](url) | Urgent | Bucket name |
| [SELF-NNNN](url) | High | Bucket name |
```

Update the audit doc status to: `Audit complete — issues created`

### Step 5: Present Results

Show the user:

1. Table of created issues with IDs, priorities, and URLs
2. Any buckets that were skipped or consolidated
3. Remind them: "Use `/spec-from-audit` to generate specs for these issues."

**Stop here.** Do not create specs.

## Important Notes

- Never run `git commit` or `git push`.
- Ask before creating — never create issues without user confirmation on team/project/priority.
- If a bucket seems too large (>2k LOC estimate), suggest splitting before creating.
- If buckets have dependencies between them, note this in the issue descriptions and use Linear's `blockedBy` field.
