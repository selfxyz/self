# Spec Authoring Guide

> How to write specs for the Self SDK project. Generic principles — portable to any project.

## Quick Start

Copy-paste one of these prompts to start a new spec session:

**New overview spec (tier 1 — architecture):**

```
Read specs/SPEC-GUIDE.md, specs/PROJECT-RULES.md, and specs/TEMPLATE-OVERVIEW.md.
Then analyze the codebase to create an overview spec for [PROJECT NAME].

Before writing, research:
- What modules/packages exist and their current state
- Open PRs and in-progress work
- Dependencies between components
- What's done vs what's remaining

Write the spec to specs/OVERVIEW.md using the template.
Do not skip: north star, architecture diagram, module table, status checklist, system-level I/O.
Run the review checklist from SPEC-GUIDE.md before finishing.
```

**New implementation spec (tier 2 — for a specific workstream):**

```
Read specs/SPEC-GUIDE.md, specs/PROJECT-RULES.md, specs/TEMPLATE-IMPLEMENTATION.md,
and specs/OVERVIEW.md.
Then analyze the codebase to create an implementation spec for [PERSON/SCOPE].

Before writing, research:
- The specific files this workstream will touch (read them, check line numbers)
- Current test coverage and validation commands that actually run
- Dependencies on other workstreams
- What's already been implemented vs what remains

Write the spec to specs/[person-scope]/SPEC.md using the template.
Do not skip: problem table with file:line refs, I/O examples per task and chunk,
files in/out of scope, token-budgeted chunks, definition of done.
Run the review checklist from SPEC-GUIDE.md before finishing.
```

**Refactor an existing spec to match the new format:**

```
Read specs/SPEC-GUIDE.md, specs/PROJECT-RULES.md, and specs/TEMPLATE-IMPLEMENTATION.md.
Then read the existing spec at specs/[OLD-SPEC].md.

Refactor it to match the template format. Analyze the codebase to verify:
- File references are accurate (correct paths and line numbers)
- Status/completion percentages reflect current state
- No stale or outdated information

Add any missing sections: north star, I/O examples, files out of scope,
token budgets per chunk, definition of done, review checklist pass.
```

---

## Why We Spec This Way

Specs serve two audiences simultaneously:

1. **Humans** — developers, architects, eng leads who need to understand what's being built and where things stand
2. **AI agents** — Claude Code, Codex, or similar tools that implement chunks of work from spec prompts

A good spec lets a new dev comprehend the system in 60 seconds and lets an AI agent produce a correct PR from a single chunk.

## The Two-Tier System

Every project has two types of specs:

| Tier               | File               | Audience                     | Purpose                                        |
| ------------------ | ------------------ | ---------------------------- | ---------------------------------------------- |
| **Overview**       | `OVERVIEW.md`      | Architect, eng lead, new dev | System-level architecture, status, cross-links |
| **Implementation** | `person-*/SPEC.md` | Implementer (human or agent) | Exact scope, code changes, I/O, chunks         |

The overview is the map. The implementation spec is turn-by-turn directions. Both reference each other.

Use `TEMPLATE-OVERVIEW.md` and `TEMPLATE-IMPLEMENTATION.md` to create new specs.

## How to Create a Spec

Templates are useless without a research process. Follow this workflow:

1. **Read** `OVERVIEW.md` and `PROJECT-RULES.md` — understand the system and constraints
2. **Analyze the codebase** — run the code, read key files, check test coverage, review open PRs. Don't assume — verify.
3. **Fill in the Problem section first** — this forces you to do real research before writing solutions
4. **Write scope of work with I/O examples** — if you can't write the I/O, you don't understand the requirement
5. **Size and sequence chunks** — estimate tokens, identify dependencies
6. **Run the review checklist** — see below. Don't share the spec until it passes.

## Spec Review Checklist

Before sharing a spec, verify:

- [ ] North star is specific enough to make decisions against (not "make it better")
- [ ] Every chunk has I/O examples with at least one error/edge case
- [ ] Every file reference points to a real file with real line numbers (verified, not assumed)
- [ ] No chunk exceeds L (~15k tokens of code changes)
- [ ] Validation commands actually run (you tested them)
- [ ] "Files NOT modified" section is populated (not just "Files modified")
- [ ] Definition of done is a single verifiable statement
- [ ] Cross-links to overview and sibling specs are present
- [ ] Chunk dependency graph has no cycles
- [ ] A dev unfamiliar with the codebase could pick up any chunk and start working

## Writing for AI Agents

Specs serve as prompts. Write them so an AI agent can produce a correct PR from a single chunk:

- **Use second person.** "You are making X portable" not "X should be made portable"
- **Be explicit about constraints.** "You will NOT modify..." not just "Focus on..."
- **Provide exact file paths with line numbers.** `src/proving/provingMachine.ts:543` not "the proving machine file"
- **State the validation command.** Agents will run it. If it's not there, they'll skip validation.
- **One chunk = one self-contained prompt.** The chunk must include enough context to execute without reading the full spec. Reference specific sections of the spec if needed, but don't assume the agent has read everything.
- **Distinguish modification from creation.** Use BEFORE/AFTER for existing files. Use "Create" + skeleton + interface it implements for new files.
- **Use `--remote` for M and L chunks.** Medium and large chunks benefit from running Claude Code with `claude --remote` so work continues in the background without tying up a terminal. This is especially useful when running multiple chunks in parallel across different workstreams.

## Strong Suggestions

These are patterns that consistently produce high-quality specs. They are strong suggestions, not hard rules. If you skip one, document why in the **Spec Deviations** section of your spec.

### 1. North Star at the Top

Every spec opens with 2-3 sentences on why this project exists from a business/product perspective and one measurable success metric. This anchors every decision in the spec.

### 2. Architecture Diagram

The overview spec must have an ASCII architecture diagram. This is the single most impactful element — a new dev reads it and understands the system in 30 seconds. Implementation specs include diagrams only if they clarify that workstream's specific scope.

### 3. Status Checklist

The overview has an aggregated checklist of all milestones. Each implementation spec has a per-chunk status table. Between the two, anyone can find overall or detailed status in one place.

### 4. Input / Output Examples

Every piece of work (task, chunk, endpoint, adapter) includes concrete I/O examples. These act as mini mock tests so you can visually validate the direction before and after implementation.

Format adapts to the interface:

- **API endpoint** — method, URL, JSON request/response, error cases
- **Bridge message** — postMessage JSON in both directions
- **Function/adapter** — arguments, return value, side effects, edge cases
- **State machine** — state before, action, state after, events emitted
- **Config** — different host configs, observed behavior
- **UI/screen** — user context, what they see

If you can't write the I/O example, you don't understand the requirement well enough to spec it.

### 5. Files In Scope / Out of Scope

List the files that will be modified AND the files that will not be modified with a reason. This gives agents guardrails and prevents scope creep. Equally important: knowing what NOT to touch.

### 6. Token-Budgeted Chunks

Every chunk of work has an estimated token size. This ensures:

- Predictable AI agent sessions (fits in one context window)
- Consistent PR size (reviewable, not overwhelming)
- Parallelism (any available dev/agent picks up a chunk)

| Size  | Tokens        | Guideline                                         |
| ----- | ------------- | ------------------------------------------------- |
| **S** | ~2,000-4,000  | Config changes, type additions, single-file edits |
| **M** | ~4,000-8,000  | Multi-file refactor, new adapter, new test suite  |
| **L** | ~8,000-15,000 | Complex logic change touching core paths          |

No chunk exceeds L. If it does, split it.

Token budget estimates the **total code changes (additions + modifications)** in the chunk, not the spec text describing it. When in doubt, paste your planned diff into a token counter to verify sizing.

### 7. BEFORE / AFTER Code Blocks

When modifying existing code, show the exact current code and the exact target code. No ambiguity about what "fix it" means.

### 8. Dependency Graph

Show which chunks block which. This enables parallel work — if Chunk A and Chunk C have no dependency, two devs/agents can work them simultaneously.

### 9. Validation Commands

After each chunk, provide actual shell commands to verify success. Not "check it works" — actual commands with expected output.

### 10. Definition of Done

Each implementation spec has a single, unambiguous statement of what "done" means. It should be verifiable by running a command or observing a behavior, not by reading code.

### 11. Prerequisites / Glossary

Implementation specs list what the reader needs to know before starting: patterns, tools, domain terms. A 5-line section that prevents hours of confusion.

### 12. Cross-Links

The overview links to all implementation specs. Each implementation spec links back to the overview and to sibling specs it depends on or coordinates with. No spec exists in isolation.

## Test Plan Guidance

Each implementation spec includes a test section per chunk. Keep it tabular:

| Test          | Type                            | What it validates |
| ------------- | ------------------------------- | ----------------- |
| `[test name]` | Unit / Integration / Build gate | [one sentence]    |

Three levels of testing:

1. **Unit** — runs in test runner, no external deps
2. **Integration** — exercises real interactions (browser harness, device)
3. **Build gate** — automated checks that block merge (type-check, bundle purity)

## Post-Completion: "What Was Built" Appendix

When a spec is fully implemented, add a brief appendix at the bottom. Not a separate file — keep everything together.

Contents:

- **Architecture (brief)** — 3-5 sentences on what was built, key decisions
- **Deviations from Spec** — table of what changed and why
- **Key Files (final)** — updated file reference table
- **Lessons / Gotchas** — one-liners for the next person

Keep it brief and factual. No victory laps.

## Follow-Up Section

Items discovered during implementation that are out of scope go in a Follow-up table at the bottom:

| Item                      | Discovered during | Suggested spec         |
| ------------------------- | ----------------- | ---------------------- |
| [thing that needs fixing] | [which chunk]     | [new or existing spec] |

Each item either becomes a new spec or gets added to an existing one. This is the parking lot — captures work without derailing the current spec.

## Spec Deviations

When a spec intentionally skips a strong suggestion from this guide, include a Spec Deviations table:

| Suggestion skipped | Reason                      |
| ------------------ | --------------------------- |
| [which suggestion] | [why it doesn't apply here] |

This keeps accountability without rigidity. Development has no hard and fast rules — but when you deviate from proven patterns, document the reasoning.

## Folder Structure

```
specs/
  SPEC-GUIDE.md                  <- This file (generic, portable)
  PROJECT-RULES.md               <- Project-specific rules
  TEMPLATE-OVERVIEW.md           <- Copy-paste tier 1 template
  TEMPLATE-IMPLEMENTATION.md     <- Copy-paste tier 2 template
  OVERVIEW.md                    <- The architecture spec

  person1-webview/
    SPEC.md                      <- Person 1's implementation spec

  person2-native-shells/
    SPEC.md                      <- Person 2's implementation spec

  personN-scope/
    SPEC.md                      <- Additional workstreams

  integrations/
    SPEC-[NAME].md               <- Cross-cutting integration specs
```

Each person gets a folder (room for supporting docs later). `SPEC.md` inside each folder is always the implementation spec — consistent naming. Integration specs that span multiple workstreams live in `integrations/`.

## Gold Standard Reference

When filling in a template, use `person3-sdk-core/SPEC.md` as the reference implementation of a well-executed implementation spec. It demonstrates: concrete file:line problem identification, BEFORE/AFTER code blocks, decision points with recommendations, files in/out of scope, token-sized chunks with dependency graphs, and multi-level validation plans.
