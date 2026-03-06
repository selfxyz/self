# Spec Templates

Three copy-paste templates. Pick the one that matches what you're writing.

| Template                                             | When to use                                                                 | Output file                                   |
| ---------------------------------------------------- | --------------------------------------------------------------------------- | --------------------------------------------- |
| [Project Overview](#project-overview-template)       | One per project. System-level architecture. Changes rarely.                 | `specs/<project>/OVERVIEW.md`                 |
| [Workstream Overview](#workstream-overview-template) | Orientation context. Merge as `## Context` section into SPEC.md.            | Merged into `workstreams/<scope>/SPEC.md`     |
| [Implementation Spec](#implementation-spec-template) | One per person/workstream. Detailed build instructions. Changes frequently. | `specs/<project>/workstreams/<scope>/SPEC.md` |

---

# Project Overview Template

<!-- Copy everything below this line through the next "---" separator. -->

## [Project Name] — Architecture Specification

> Last updated: [date]
> Owner: [name/team]
> Status: [Draft | Active | Complete]

### North Star

<!-- Bullet-point list. Why does this project exist? What does success look
like? Use 2-4 bullets for easy scanning, not a paragraph. -->

- [Business/product goal — why this exists]
- [Success metric — measurable outcome]
- [Key constraint — the non-negotiable]

### Status Checklist

<!-- Aggregated milestones across all workstreams. Update as work progresses. -->

- [ ] Architecture finalized
- [ ] [Milestone]
- [ ] [Milestone]
- [ ] Integration: [target]

### Architecture Diagram

<!-- ASCII diagram of the full system. Single most important element.
A new dev should understand the system in 30 seconds. -->

```
[diagram]
```

### Design Principles

<!-- 3-5 project-level principles. Opinionated, numbered, one sentence each. -->

1. **[Principle].** [Explanation.]
2. **[Principle].** [Explanation.]
3. **[Principle].** [Explanation.]

### Module Table

<!-- Every module in the system. Status and % done should reflect ground truth. -->

| Module     | Location | Language | What It Does   | Status  | % Done | Action Needed      |
| ---------- | -------- | -------- | -------------- | ------- | ------ | ------------------ |
| **[Name]** | `path/`  | [lang]   | [one sentence] | [state] | **X%** | [action or "None"] |

### Decision Matrix

<!-- Key architectural decisions as a scannable binary table. Use YES/NO,
KEEP/DELETE, NATIVE/WEB — columns that are instantly scannable without
reading prose. Add a rationale column only if the decision isn't obvious. -->

| Capability | Must be native? | Platform A            | Platform B            | Web Fallback         |
| ---------- | --------------- | --------------------- | --------------------- | -------------------- |
| [thing]    | YES / NO        | KEEP / BUILD / DELETE | KEEP / BUILD / DELETE | [fallback or "None"] |

### Impact Summary

<!-- Quantify the benefit of this project. Numbers are more persuasive
than prose. Adapt columns to what matters for your project. -->

| Metric   | Current | After   | Saved   |
| -------- | ------- | ------- | ------- |
| [metric] | [value] | [value] | [delta] |

### Shared Contracts / Protocols

<!-- If components in the system communicate (API, bridge, events),
document the shared contract here. Message format, transport, timeouts.
This is the single source of truth that all workstreams build against. -->

### Workstreams

<!-- Who does what. Link to each person's implementation spec. -->

```
Person 1 — [Scope]   -> workstreams/<scope>/SPEC.md
|- [deliverable]
|- [deliverable]
'- [deliverable]

Person 2 — [Scope]   -> workstreams/<scope>/SPEC.md
|- [deliverable]
'- [deliverable]
```

### Input / Output — System Level

<!-- The top-level contract: what goes INTO the system and what comes OUT.
"If we build everything right, here's what it looks like." -->

**Input:**

```
[Example: API call, SDK launch call, user action that kicks off the system]
```

**Output:**

```
[Example: callback result, UI state, observable outcome]
```

### Migration Path

<!-- If this project replaces or evolves an existing system, describe the phases. -->

1. **Phase 1 (Now):** [what's happening]
2. **Phase 2:** [what comes next and what triggers it]
3. **Phase 3:** [end state]

### Glossary

<!-- Domain terms, acronyms, abbreviations. Keep it short — only terms that
would confuse a new dev or AI agent. -->

| Term   | Definition   |
| ------ | ------------ |
| [term] | [definition] |

---

# Workstream Overview Template

<!-- Copy everything below this line through the next "---" separator. -->

## [Person N]: [Scope] — Workstream Overview

> Last updated: [date]
> Owner: [name]
> Project: `../OVERVIEW.md`
> Implementation: `./SPEC.md`
> Status: [Draft | Active | Complete]

### North Star

<!-- Same project-level north star from the project overview. 2-4 bullets. -->

- [Business/product goal — why this exists]
- [Success metric — measurable outcome]
- [Key constraint — the non-negotiable]

### Status

<!-- High-level milestones for this workstream. -->

- [x] [milestone]
- [ ] [milestone]
- [ ] [milestone]

### What You Own

<!-- 3-5 bullets. What packages, deliverables, and outputs does this
workstream produce? Keep it scannable — details live in SPEC.md. -->

- [package or scope item]
- [package or scope item]
- [key deliverable or artifact]

### Architecture Context

<!-- Focused diagram showing where THIS workstream's work fits in the larger
system. Highlight what this workstream builds vs what it consumes from others.
Keep it simpler than the project-level diagram — just enough context. -->

```
[focused diagram]
```

### Dependencies

<!-- What you need from other workstreams and what they need from you.
Update status as work progresses. -->

| Direction     | Workstream / Package | What                         | Status  |
| ------------- | -------------------- | ---------------------------- | ------- |
| **You need**  | [scope]              | [what you consume from them] | [state] |
| **Needs you** | [scope]              | [what they consume from you] | [state] |

### Key Decisions

<!-- Decisions specific to this workstream. Link to the project overview
decision matrix for system-wide decisions. -->

| Decision   | Choice   | Rationale |
| ---------- | -------- | --------- |
| [decision] | [choice] | [why]     |

### Deliverables

<!-- What this workstream ships. Artifact names, types, consumers. -->

| Deliverable          | Type            | Consumers     |
| -------------------- | --------------- | ------------- |
| [package / artifact] | [npm / AAR / …] | [who uses it] |

---

# Implementation Spec Template

<!-- Copy everything below this line to the end of the file. -->

## [Component/Scope] — Implementation Spec

> Last updated: [date]
> Owner: [name]
> Parent: `../OVERVIEW.md`
> Status: [Draft | Active | Complete]

### North Star

<!-- Bullet-point list of what success looks like. Same project-level north
star from the overview spec. Repeated here so the implementer never loses
sight of why this work matters. Use 2-4 bullets, not a paragraph. -->

- [Business/product goal — why this exists]
- [Success metric — measurable outcome]
- [Key constraint — the non-negotiable]

### Overview

<!-- Second person. 2-3 sentences. "You are [doing what] to [which package].
This matters because [context]." -->

### Prerequisites

<!-- What the reader needs to know before starting. Keep to 5 lines max. -->

- Familiarity with [pattern/tool/concept]
- [Term] = [definition]
- Read the `## Context` section in this `SPEC.md` for workstream context

### The Problem

<!-- What's broken/missing/wrong today. Be specific — file:line references. -->

| File            | Issue          |
| --------------- | -------------- |
| `src/foo.ts:42` | [what's wrong] |

### Design Principles

<!-- 3-5 principles specific to THIS workstream. Not the project-level ones
from the overview — those are already linked. These guide implementation
choices within this scope. -->

1. **[Principle].** [Why.]
2. **[Principle].** [Why.]

### Definition of Done

<!-- Single unambiguous statement. Verifiable by running a command or
observing a behavior, not by reading code. -->

> **Done when:** [statement]

### Scope of Work

<!-- Use the pattern that fits: BEFORE/AFTER for modifying existing code,
CREATE for new files. Every task needs I/O with at least one edge case. -->

#### 1. [Task Name — Modify Existing]

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

##### Input / Output

<!-- Use whichever format matches the interface:
API, bridge message, function, state machine, config, UI. -->

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

#### 2. [Task Name — Create New]

**Create:** `src/path/to/new-file.ts`

**Implements:** `[InterfaceName]` from `src/types/[file].ts`

<!-- Show the structure and public API, not the full implementation.
The implementer fills in the logic. -->

```typescript
// SKELETON
[exports, function signatures, key types — enough to show the shape]
```

##### Input / Output

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

### Files You Will Modify

| File         | Change         | Risk                     |
| ------------ | -------------- | ------------------------ |
| `src/foo.ts` | [what changes] | **High/Med/Low** — [why] |

### Files You Will NOT Modify

| File         | Why                                                 |
| ------------ | --------------------------------------------------- |
| `src/bar.ts` | [out of scope / owned by another workstream / etc.] |

### Chunking Guide

<!-- For M and L chunks, run with `claude --remote` so work continues in the
background. Multiple chunks across workstreams can run in parallel this way. -->

#### Chunk [ID]: [Name] — [S/M/L ~Xk tokens]

<!-- No dependencies = "start here". Otherwise list what must complete first. -->

**Goal:** [One sentence.]

**Steps:**

1. [Concrete step]
2. [Concrete step]
3. Validate: [specific command or check]

##### Input / Output — Chunk Validation

<!-- After completing this chunk, this should work: -->

**Input:**

```
[concrete test: CLI command, function call, etc.]
```

**Expected Output:**

```
[what you should see]
```

##### Tests

| Test                    | Type                            | What it validates |
| ----------------------- | ------------------------------- | ----------------- |
| [test name/description] | Unit / Integration / Build gate | [one sentence]    |

---

#### Chunk [ID]: [Name] — [S/M/L ~Xk tokens]

**Depends on:** Chunk [ID]

**Goal:** [One sentence.]

**Steps:**

1. [step]
2. [step]
3. Validate: [check]

##### Input / Output — Chunk Validation

**Input:**

```
[test]
```

**Expected Output:**

```
[result]
```

##### Tests

| Test   | Type   | What it validates |
| ------ | ------ | ----------------- |
| [test] | [type] | [validates]       |

---

### Dependency Graph

```
Chunk A (no deps)
  |---> Chunk B (after A)
  |       '---> Chunk D (after B)
  |---> Chunk C (after A)
  '---> Chunk E (after A, optional)
```

### Completion Status

| Chunk | Description | Size  | Status                                                 |
| ----- | ----------- | ----- | ------------------------------------------------------ |
| [ID]  | [name]      | S/M/L | **Pending** / **In Progress** / **Done** / **Skipped** |

### Validation Plan

```bash
# After every chunk (must pass):
[type-check command]
[test command]

# After all chunks:
[integration check command]
```

### Key Reference Files

| File              | What to Look At   |
| ----------------- | ----------------- |
| `path/to/file.ts` | [what's relevant] |

---

<!-- Everything below this line is filled in AFTER implementation. -->

### What Was Built

<!-- Added post-completion. Brief and factual. -->

#### Architecture (brief)

<!-- 3-5 sentences. Pattern used, key decisions made during implementation. -->

#### Deviations from Spec

| Spec said       | We did                  | Why      |
| --------------- | ----------------------- | -------- |
| [original plan] | [actual implementation] | [reason] |

#### Key Files (final)

| File           | Role           |
| -------------- | -------------- |
| `src/thing.ts` | [what it does] |

#### Lessons / Gotchas

- [One-liner that would help the next person]

---

### Follow-Up (Out of Scope)

<!-- Items discovered during implementation that need future work. -->

| Item    | Discovered during | Suggested spec         |
| ------- | ----------------- | ---------------------- |
| [thing] | Chunk [ID]        | [new or existing spec] |
