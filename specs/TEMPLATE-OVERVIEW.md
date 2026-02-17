# [Project Name] — Architecture Specification

> Last updated: [date]
> Owner: [name/team]
> Status: [Draft | Active | Complete]

## North Star

<!-- Bullet-point list. Why does this project exist? What does success look
like? Use 2-4 bullets for easy scanning, not a paragraph. -->

- [Business/product goal — why this exists]
- [Success metric — measurable outcome]
- [Key constraint — the non-negotiable]

## Status Checklist

<!-- Aggregated milestones across all workstreams. Update as work progresses. -->

- [ ] Architecture finalized
- [ ] [Milestone]
- [ ] [Milestone]
- [ ] Integration: [target]

## Architecture Diagram

<!-- ASCII diagram of the full system. Single most important element.
A new dev should understand the system in 30 seconds. -->

```
[diagram]
```

## Design Principles

<!-- 3-5 project-level principles. Opinionated, numbered, one sentence each. -->

1. **[Principle].** [Explanation.]
2. **[Principle].** [Explanation.]
3. **[Principle].** [Explanation.]

## Module Table

<!-- Every module in the system. Status and % done should reflect ground truth. -->

| Module     | Location | Language | What It Does   | Status  | % Done | Action Needed      |
| ---------- | -------- | -------- | -------------- | ------- | ------ | ------------------ |
| **[Name]** | `path/`  | [lang]   | [one sentence] | [state] | **X%** | [action or "None"] |

## Decision Matrix

<!-- Key architectural decisions as a scannable binary table. Use YES/NO,
KEEP/DELETE, NATIVE/WEB — columns that are instantly scannable without
reading prose. Add a rationale column only if the decision isn't obvious. -->

| Capability | Must be native? | Platform A            | Platform B            | Web Fallback         |
| ---------- | --------------- | --------------------- | --------------------- | -------------------- |
| [thing]    | YES / NO        | KEEP / BUILD / DELETE | KEEP / BUILD / DELETE | [fallback or "None"] |

## Impact Summary

<!-- Quantify the benefit of this project. Numbers are more persuasive
than prose. Adapt columns to what matters for your project. -->

| Metric   | Current | After   | Saved   |
| -------- | ------- | ------- | ------- |
| [metric] | [value] | [value] | [delta] |

## Shared Contracts / Protocols

<!-- If components in the system communicate (API, bridge, events),
document the shared contract here. Message format, transport, timeouts.
This is the single source of truth that all workstreams build against. -->

## Workstreams

<!-- Who does what. Link to each person's implementation spec. -->

```
Person 1 — [Scope]                       -> person1-scope/SPEC.md
|- [deliverable]
|- [deliverable]
'- [deliverable]

Person 2 — [Scope]                       -> person2-scope/SPEC.md
|- [deliverable]
'- [deliverable]
```

## Input / Output — System Level

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

## Migration Path

<!-- If this project replaces or evolves an existing system, describe the phases. -->

1. **Phase 1 (Now):** [what's happening]
2. **Phase 2:** [what comes next and what triggers it]
3. **Phase 3:** [end state]

## Glossary

<!-- Domain terms, acronyms, abbreviations. Keep it short — only terms that
would confuse a new dev or AI agent. -->

| Term   | Definition   |
| ------ | ------------ |
| [term] | [definition] |

## Related Specs

<!-- Link to every implementation spec and cross-cutting integration spec. -->

| Spec                                             | Audience    | What it covers |
| ------------------------------------------------ | ----------- | -------------- |
| [person1-scope/SPEC.md](./person1-scope/SPEC.md) | Implementer | [scope]        |
| [person2-scope/SPEC.md](./person2-scope/SPEC.md) | Implementer | [scope]        |

## Spec Deviations

<!-- If this spec intentionally skips strong suggestions from SPEC-GUIDE.md,
document which ones and why. Remove this section if none. -->

| Suggestion skipped | Reason |
| ------------------ | ------ |
| [suggestion]       | [why]  |
