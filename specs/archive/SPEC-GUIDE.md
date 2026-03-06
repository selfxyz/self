# Spec Authoring Guide

> How to write specs for the Self SDK project. Generic principles — portable to any project.

## Quick Start

Copy-paste one of these prompts to start a new spec session:

**New project overview (tier 1 — architecture):**

```text
Read specs/framework/SPEC-GUIDE.md, specs/framework/PROJECT-RULES.md, and specs/framework/TEMPLATES.md (Project Overview section).
Then analyze the codebase to create a project overview for [PROJECT NAME].

Before writing, research:
- What modules/packages exist and their current state
- Open PRs and in-progress work
- Dependencies between components
- What's done vs what's remaining

Write the spec to specs/projects/[project]/OVERVIEW.md using the template.
Do not skip: north star, architecture diagram, module table, status checklist, system-level I/O.
Run the review checklist from SPEC-GUIDE.md before finishing.
```

**New workstream overview (tier 2 — orientation for a specific workstream):**

```text
Read specs/framework/SPEC-GUIDE.md, specs/framework/PROJECT-RULES.md, specs/framework/TEMPLATES.md (Workstream Overview section),
and specs/projects/sdk/OVERVIEW.md.
Then analyze the codebase to create a workstream overview for [PERSON/SCOPE].

Before writing, research:
- What packages and files this workstream owns
- Dependencies on other workstreams (both directions)
- Current status and milestones
- Key decisions specific to this workstream

Write the spec to specs/projects/[project]/workstreams/[scope]/OVERVIEW.md using the template.
Do not skip: north star, what you own, architecture context diagram, dependencies table,
status milestones, deliverables.
Run the review checklist from SPEC-GUIDE.md before finishing.
```

**New implementation spec (tier 3 — for a specific workstream):**

```text
Read specs/framework/SPEC-GUIDE.md, specs/framework/PROJECT-RULES.md, specs/framework/TEMPLATES.md (Implementation Spec section),
and specs/projects/[project]/workstreams/[scope]/OVERVIEW.md.
Then analyze the codebase to create an implementation spec for [SCOPE].

Before writing, research:
- The specific files this workstream will touch (read them, check line numbers)
- Current test coverage and validation commands that actually run
- Dependencies on other workstreams
- What's already been implemented vs what remains

Write the spec to specs/projects/[project]/workstreams/[scope]/SPEC.md using the template.
Do not skip: problem table with file:line refs, I/O examples per task and chunk,
files in/out of scope, token-budgeted chunks, definition of done.
Run the review checklist from SPEC-GUIDE.md before finishing.
```

**Refactor an existing spec to match the new format:**

```text
Read specs/framework/SPEC-GUIDE.md, specs/framework/PROJECT-RULES.md, and specs/framework/TEMPLATES.md.
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

## The Three-Tier System

Every project has three types of specs:

| Tier                    | File                              | Audience                     | Purpose                                                  | Change Frequency |
| ----------------------- | --------------------------------- | ---------------------------- | -------------------------------------------------------- | ---------------- |
| **Project Overview**    | `OVERVIEW.md`                     | Architect, eng lead, new dev | System-level architecture, ties all workstreams together | Rarely           |
| **Workstream Overview** | `workstreams/<scope>/OVERVIEW.md` | Dev joining a workstream     | What this workstream owns, dependencies, status, context | Occasionally     |
| **Implementation**      | `workstreams/<scope>/SPEC.md`     | Implementer (human or agent) | Exact scope, code changes, I/O, token-budgeted chunks    | Frequently       |

The project overview is the map. The workstream overview is orientation for a new team member. The implementation spec is turn-by-turn directions. All three reference each other.

All three templates live in `TEMPLATES.md` — pick the section that matches what you're writing.

## How to Create a Spec

Templates are useless without a research process. Follow this workflow:

1. **Read** the project `OVERVIEW.md` and `PROJECT-RULES.md` — understand the system and constraints
2. **Analyze the codebase** — run the code, read key files, check test coverage, review open PRs. Don't assume — verify.
3. **Fill in the Problem section first** — this forces you to do real research before writing solutions
4. **Write scope of work with I/O examples** — if you can't write the I/O, you don't understand the requirement
5. **Size and sequence chunks** — estimate tokens, identify dependencies
6. **Run the review checklist** — see below. Don't share the spec until it passes.

## Rules Reminder

Every spec must respect [Project Rules](./PROJECT-RULES.md). When writing chunk instructions, apply the rules that are relevant to the work — especially the **Reuse & Maintainability** section for UI/component work and the **Architecture** section for native/bridge work. Don’t cargo-cult UI rules into non-UI specs or vice versa.

Also:

- Write plans to disk before implementation and keep status checklists current.
- Prefer repository validation commands (Yarn workspaces) over ad hoc `npx` when available.
- Token-budgeted chunks and LOC-based PR sizing are different constraints; satisfy both.

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
- **Write plans to disk before executing.** Before starting multi-step work, write the plan to a file (update the project PLAN.md, SPEC.md status tables, or create a session plan file). Session memory is ephemeral — API errors, context overflow, or `/clear` will destroy it. A plan on disk survives session loss, enables multiple agents to work from the same plan, and creates an audit trail. Never rely on session transcript as the only record of what was planned.

## Strong Suggestions

These are patterns that consistently produce high-quality specs. They are strong suggestions, not hard rules. If you skip one, document why in the **Spec Deviations** section of your spec.

### 1. North Star as Bullet Points

Every spec opens with a bullet-point list (2-4 bullets) covering: business/product goal, measurable success metric, and key constraint. Use bullets, not a paragraph — they're faster to scan and harder to misread. This anchors every decision in the spec.

### 2. Architecture Diagram

The overview spec must have an ASCII architecture diagram. This is the single most impactful element — a new dev reads it and understands the system in 30 seconds. Implementation specs include diagrams only if they clarify that workstream's specific scope.

### 3. Status Checklist Near the Top

The project overview has an aggregated checklist of all milestones. Each workstream overview has a per-workstream checklist placed immediately after the north star — it's the first thing devs check. Each implementation spec has a per-chunk status table. Between the three, anyone can find overall, workstream, or detailed status in one place.

**Review checklists before starting work.** At the start of every work session, read the OVERVIEW.md status checklist and SPEC.md chunk status table for your workstream. Verify the status reflects reality — if something is marked "Done" that isn't, or "Pending" that's actually in progress, fix it before doing anything else. This prevents building on stale assumptions.

**Keep checklists current.** When you complete a chunk, check off the corresponding items in both the OVERVIEW.md status checklist and the SPEC.md chunk status table. Stale checklists erode trust in the specs — if the status is wrong, devs stop reading them.

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

### 13. Second-Person Viewpoint

Implementation specs are written in second person, addressing the implementer directly. "You are building the native side of the SDK" not "The native side of the SDK will be built." This makes specs actionable — the reader knows they are the one doing the work. It also makes specs work as AI agent prompts without modification.

### 14. Per-Person Overview Files

Every workstream folder has both an `OVERVIEW.md` (stable orientation) and a `SPEC.md` (living implementation details). The overview answers "what do I own and why?" — it changes rarely. The implementation spec answers "how do I build it?" — it changes with every chunk. Separating them means the project overview ties workstreams together without coupling to implementation churn, and new devs can understand their workstream's context in 2 minutes without reading the full implementation spec.

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

```text
specs/
  README.md                      <- Table of contents (start here)
  ARCHIVE.md                     <- Append-only log of retired specs

  framework/
    SPEC-GUIDE.md                <- This file (generic, portable)
    PROJECT-RULES.md             <- Project-specific rules
    TEMPLATES.md                 <- All three templates in one file

  projects/
    sdk/
      INDEX.md                   <- SDK project entrypoint
      OVERVIEW.md                <- Architecture spec (stable)
      PLAN.md                    <- Execution wave plan
      HANDOFF.md                 <- Follow-up tracker
      STATUS.md                  <- SDK-wide status
      workstreams/
        webview/                 <- WebView UI + bridge
        native-shells/           <- KMP native shells
        integrations/            <- MiniPay + samples
        sdk-core/                <- SDK core adaptation
        rn-sdk/                  <- React Native SDK

    kmp/
      INDEX.md                   <- KMP entrypoint
      ARCHITECTURE.md
      INITIATIVE.md
      REORG-PLAN.md

    lottie/                      <- Lottie migration
    euclid/                      <- Euclid consolidation
    ci/                          <- CI coverage specs

  shared/
    handoffs/                    <- Cross-project handoffs

  archive/                       <- Archived/retired spec plans
```

Each workstream gets a folder with two files: `OVERVIEW.md` (what you own, context, dependencies — changes rarely) and `SPEC.md` (how to build it, chunks, code — changes often). Integration specs that span multiple workstreams live in `integrations/`.

## Reference Implementation

Use `projects/sdk/workstreams/sdk-core/SPEC.md` as the reference when filling in a template. It demonstrates: concrete file:line problem identification, BEFORE/AFTER code blocks, decision points with recommendations, files in/out of scope, token-sized chunks with dependency graphs, and multi-level validation plans.
