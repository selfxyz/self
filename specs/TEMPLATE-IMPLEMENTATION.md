# [Component/Scope] — Implementation Spec

> Last updated: [date]
> Owner: [name]
> Parent: [OVERVIEW.md](../OVERVIEW.md)
> Status: [Draft | Active | Complete]

## North Star

<!-- Bullet-point list of what success looks like. Same project-level north
star from the overview spec. Repeated here so the implementer never loses
sight of why this work matters. Use 2-4 bullets, not a paragraph. -->

- [Business/product goal — why this exists]
- [Success metric — measurable outcome]
- [Key constraint — the non-negotiable]

## Overview

<!-- Second person. 2-3 sentences. "You are [doing what] to [which package].
This matters because [context]." -->

## Prerequisites

<!-- What the reader needs to know before starting. Keep to 5 lines max. -->

- Familiarity with [pattern/tool/concept]
- [Term] = [definition]
- Read [OVERVIEW.md](../OVERVIEW.md) for architecture context

## The Problem

<!-- What's broken/missing/wrong today. Be specific — file:line references. -->

| File            | Issue          |
| --------------- | -------------- |
| `src/foo.ts:42` | [what's wrong] |

## Design Principles

<!-- 3-5 principles specific to THIS workstream. Not the project-level ones
from the overview — those are already linked. These guide implementation
choices within this scope. -->

1. **[Principle].** [Why.]
2. **[Principle].** [Why.]

## Definition of Done

<!-- Single unambiguous statement. Verifiable by running a command or
observing a behavior, not by reading code. -->

> **Done when:** [statement]

## Scope of Work

<!-- Use the pattern that fits: BEFORE/AFTER for modifying existing code,
CREATE for new files. Every task needs I/O with at least one edge case. -->

### 1. [Task Name — Modify Existing]

**`file/path.ts`** — Lines X-Y

```typescript
// BEFORE
[exact current code]
```

```typescript
// AFTER
[exact target code]
```

<!-- Explanation of why, if not obvious from the code. -->

#### Input / Output

<!-- Use whichever format matches the interface. See SPEC-GUIDE.md for
format examples: API, bridge message, function, state machine, config, UI. -->

**Input:**

```
[concrete example]
```

**Expected Output:**

```
[concrete example]
```

**Edge case — [description]:**

```
Input:  [edge case]
Output: [expected result]
```

---

### 2. [Task Name — Create New]

**Create:** `src/path/to/new-file.ts`

**Implements:** `[InterfaceName]` from `src/types/[file].ts`

<!-- Show the structure and public API, not the full implementation.
The implementer fills in the logic. -->

```typescript
// SKELETON
[exports, function signatures, key types — enough to show the shape]
```

#### Input / Output

**Input:**

```
[concrete example]
```

**Expected Output:**

```
[concrete example]
```

**Error case — [description]:**

```
Input:  [error scenario]
Output: [expected error behavior]
```

---

## Files You Will Modify

| File         | Change         | Risk                     |
| ------------ | -------------- | ------------------------ |
| `src/foo.ts` | [what changes] | **High/Med/Low** — [why] |

## Files You Will NOT Modify

| File         | Why                                                 |
| ------------ | --------------------------------------------------- |
| `src/bar.ts` | [out of scope / owned by another workstream / etc.] |

## Chunking Guide

<!-- For M and L chunks, run with `claude --remote` so work continues in the
background. Multiple chunks across workstreams can run in parallel this way. -->

### Chunk [ID]: [Name] — [S/M/L ~Xk tokens]

<!-- No dependencies = "start here". Otherwise list what must complete first. -->

**Goal:** [One sentence.]

**Steps:**

1. [Concrete step]
2. [Concrete step]
3. Validate: [specific command or check]

#### Input / Output — Chunk Validation

<!-- After completing this chunk, this should work: -->

**Input:**

```
[concrete test: CLI command, function call, etc.]
```

**Expected Output:**

```
[what you should see]
```

#### Tests

| Test                    | Type                            | What it validates |
| ----------------------- | ------------------------------- | ----------------- |
| [test name/description] | Unit / Integration / Build gate | [one sentence]    |

---

### Chunk [ID]: [Name] — [S/M/L ~Xk tokens]

**Depends on:** Chunk [ID]

**Goal:** [One sentence.]

**Steps:**

1. [step]
2. [step]
3. Validate: [check]

#### Input / Output — Chunk Validation

**Input:**

```
[test]
```

**Expected Output:**

```
[result]
```

#### Tests

| Test   | Type   | What it validates |
| ------ | ------ | ----------------- |
| [test] | [type] | [validates]       |

---

## Dependency Graph

```
Chunk A (no deps)
  |---> Chunk B (after A)
  |       '---> Chunk D (after B)
  |---> Chunk C (after A)
  '---> Chunk E (after A, optional)
```

## Completion Status

| Chunk | Description | Size  | Status                                                 |
| ----- | ----------- | ----- | ------------------------------------------------------ |
| [ID]  | [name]      | S/M/L | **Pending** / **In Progress** / **Done** / **Skipped** |

## Validation Plan

```bash
# After every chunk (must pass):
[type-check command]
[test command]

# After all chunks:
[integration check command]
```

## Coordination Notes

<!-- Who needs to know what, and when. -->

- **[Person/Team]:** [what they need from you or you from them]

## Key Reference Files

| File              | What to Look At   |
| ----------------- | ----------------- |
| `path/to/file.ts` | [what's relevant] |

---

<!-- Everything below this line is filled in AFTER implementation. -->

## What Was Built

<!-- Added post-completion. Brief and factual. -->

### Architecture (brief)

<!-- 3-5 sentences. Pattern used, key decisions made during implementation. -->

### Deviations from Spec

| Spec said       | We did                  | Why      |
| --------------- | ----------------------- | -------- |
| [original plan] | [actual implementation] | [reason] |

### Key Files (final)

| File           | Role           |
| -------------- | -------------- |
| `src/thing.ts` | [what it does] |

### Lessons / Gotchas

- [One-liner that would help the next person]

---

## Follow-Up (Out of Scope)

<!-- Items discovered during implementation that need future work. -->

| Item    | Discovered during | Suggested spec         |
| ------- | ----------------- | ---------------------- |
| [thing] | Chunk [ID]        | [new or existing spec] |

## Spec Deviations

<!-- Strong suggestions from SPEC-GUIDE.md that were intentionally skipped. -->

| Suggestion skipped | Reason |
| ------------------ | ------ |
| [suggestion]       | [why]  |
