# Agent-Optimized Spec Architecture

> Last updated: 2026-03-05
> Owner: SDK/specs maintainers
> Status: Proposed

## Problem

The current spec system was designed for humans — five workstream OVERVIEWs, five SPECs, a SPEC-GUIDE, TEMPLATES, PROJECT-RULES, a wave plan, and a handoff tracker across 30+ files totaling ~10k lines. This creates three problems for AI agents:

1. **Too many files to read before doing work.** An agent executing chunk 2C must navigate: CLAUDE.md → README → INDEX → OVERVIEW → SPEC → possibly PLAN. That's 6 files before writing a single line of code. Each file read costs context window and latency.

2. **Duplicated context across tiers.** The north star is repeated in OVERVIEW.md, every workstream OVERVIEW.md, and every SPEC.md. The rules reminder is in SPEC-GUIDE, PROJECT-RULES, and every spec header. An agent reads the same information 3-4 times.

3. **Ceremony over signal.** Spec deviations tables, review checklists, "required references" headers, prerequisites glossaries, and related specs tables exist to enforce human process. An agent doesn't need to "run the review checklist" — it needs the chunk scope, files to touch, I/O examples, and a validation command.

### Current file inventory

| Category                                                                          | Files  | Total lines | Agent reads per chunk |
| --------------------------------------------------------------------------------- | ------ | ----------- | --------------------- |
| Framework (SPEC-GUIDE, TEMPLATES, PROJECT-RULES, PRODUCT-SPEC-ENHANCEMENT-PROMPT) | 4      | 1,355       | 0-1 (mostly skipped)  |
| SDK project-level (OVERVIEW, PLAN, HANDOFF, STATUS, INDEX)                        | 5      | 903         | 1-2                   |
| Workstream OVERVIEWs (5)                                                          | 5      | 541         | 1                     |
| Workstream SPECs (5)                                                              | 5      | 6,416       | 1                     |
| KMP project                                                                       | 4      | 431         | 0-1                   |
| Other (lottie, euclid, ci, shared, archive)                                       | 7      | 704         | 0                     |
| **Total**                                                                         | **30** | **10,350**  | **3-5 per chunk**     |

### Fake projects add navigation overhead

Four of the five "projects" under `specs/projects/` are not projects — they're either part of SDK or standalone docs wrapped in unnecessary scaffolding:

| "Project" | Real content                               | Workstreams                                          | Verdict                       |
| --------- | ------------------------------------------ | ---------------------------------------------------- | ----------------------------- |
| `sdk/`    | OVERVIEW + PLAN + HANDOFF + STATUS + INDEX | 5 workstreams with real SPECs                        | Actual project                |
| `kmp/`    | 3 skeleton docs (all TBD owners)           | None — real work is `sdk/workstreams/native-shells/` | SDK workstream, not a project |
| `lottie/` | INDEX + 1 review doc (58 lines)            | None                                                 | Standalone doc                |
| `euclid/` | INDEX + 1 plan doc (88 lines)              | None                                                 | Standalone doc                |
| `ci/`     | 1 coverage gaps doc (313 lines)            | None                                                 | Standalone doc                |

An agent looking for KMP specs navigates to `kmp/INDEX.md`, finds skeleton docs with TBD owners, then gets redirected to `sdk/workstreams/native-shells/` for the real work. The `projects/` nesting adds a directory level that serves no purpose when there's only one real project.

### What an agent actually needs

To execute a chunk, an agent needs exactly:

1. **What to build** — scope, constraints, files in/out of scope
2. **How to validate** — shell commands that prove it works
3. **Current state** — what's done, what's blocked, what's next
4. **Architecture context** — only the parts relevant to this chunk

Everything else is noise.

## Proposed Changes

### Change 1: Merge OVERVIEW into SPEC per workstream

**Before:** 2 files per workstream (OVERVIEW.md + SPEC.md)
**After:** 1 file per workstream (SPEC.md with a "Context" section at top)

The OVERVIEW files are 90-120 lines each. They contain: north star (duplicated from SDK OVERVIEW), "what you own" (3-5 bullets), architecture context diagram, dependencies table, and related specs links. All of this fits as a 30-40 line "Context" section at the top of SPEC.md.

**Why:** One file to read instead of two. The OVERVIEW content rarely changes, so it won't cause merge conflicts with SPEC chunk updates. Agents never read OVERVIEW.md without also reading SPEC.md, so they're always read together anyway.

**Migration:**

- For each workstream, prepend the useful OVERVIEW content (what you own, architecture context, dependencies) as a `## Context` section in SPEC.md
- Drop: north star (already in SPEC), rules reminder (already in CLAUDE.md), related specs table (links are in SPEC already), spec deviations table
- Delete OVERVIEW.md files
- Update INDEX.md workstream table to single column

### Change 2: Consolidate framework docs into CLAUDE.md

**Before:** SPEC-GUIDE.md (335 lines), PROJECT-RULES.md (168 lines), TEMPLATES.md (603 lines) — all in `specs/framework/`
**After:** Key rules in CLAUDE.md (where agents already read them), templates kept as a single reference file

The SPEC-GUIDE and PROJECT-RULES overlap heavily with CLAUDE.md's "Key Rules" and "Specs & Planning" sections. Agents already read CLAUDE.md at session start — it's the one file guaranteed to be in context. Rules that only exist in PROJECT-RULES.md are invisible to agents.

**Migration:**

- Audit PROJECT-RULES.md — any rule not already in CLAUDE.md gets added there
- Audit SPEC-GUIDE.md — the "Writing for AI Agents" section and review checklist move to CLAUDE.md's planning protocol
- TEMPLATES.md stays as-is (it's a copy-paste reference, not agent instructions)
- Archive SPEC-GUIDE.md and PROJECT-RULES.md
- Remove "Required References" and "Rules Reminder" boilerplate from every spec

### Change 3: Flatten the SDK project level

**Before:** INDEX.md + OVERVIEW.md + PLAN.md + HANDOFF.md + STATUS.md (5 files, 903 lines)
**After:** INDEX.md + OVERVIEW.md (2 files, ~750 lines)

- **INDEX.md** stays — it's the entrypoint
- **OVERVIEW.md** stays — architecture diagram + module table + bridge protocol are genuinely useful context
- **PLAN.md** (wave plan) → merge the chunk inventory table into OVERVIEW.md's status section. Before merging, verify all partial/deferred chunks (1E, 2F, 3C, 2L) have clear next-step descriptions in OVERVIEW.md. If any cross-workstream dependencies remain active, preserve the dependency column. Archive the wave sequencing explanation (no longer needed at 74% done).
- **HANDOFF.md** → merge open follow-up items (P1-P3 tables) into OVERVIEW.md's status checklist as "Open" items. Archive the resolved decisions section. Closure gate: every P1 item must have an owner and status before HANDOFF.md is deleted.
- **STATUS.md** (14 lines) → redundant with OVERVIEW.md status checklist. Merge its content into OVERVIEW.md, then delete. Update the canonical path reference in `specs/projects/kmp/INDEX.md` (which currently points to `specs/projects/sdk/STATUS.md` as the relocated SDK-wide status) to point to the OVERVIEW.md status section instead.

### Change 4: Strip ceremony from spec templates

Remove from the TEMPLATES.md spec template:

- "Required References" section (agents read CLAUDE.md, not a references list)
- "Rules Reminder" section (same reason)
- "Spec Deviations" table (process overhead, not agent input)
- "Related Specs" table at bottom (cross-links are useful inline, not as a footer table)
- "Coordination Notes" section (belongs in a task tracker, not a spec)

Keep:

- North star (3 bullets)
- Context section (merged from OVERVIEW)
- Problem table with file:line refs
- Scope of work with I/O examples
- Files in/out of scope
- Chunking guide with validation commands
- Definition of done
- Completion status table
- "What Was Built" appendix (post-completion)
- Follow-up table (parking lot)

### Change 5: Collapse fake projects and flatten hierarchy

**Before:**

```
specs/
  projects/
    sdk/          <- real project
    kmp/          <- skeleton redirecting to sdk/
    lottie/       <- INDEX + 1 doc
    euclid/       <- INDEX + 1 doc
    ci/           <- 1 doc
  shared/
    handoffs/     <- 1 doc
```

**After:**

```
specs/
  sdk/                              <- the one real project (drop "projects/" nesting)
    INDEX.md
    OVERVIEW.md
    workstreams/...
  topics/                           <- standalone docs, no project scaffolding
    LOTTIE-DOTLOTTIE-REVIEW.md
    EUCLID-WEB-CONSOLIDATION.md
    CI-COVERAGE-GAPS.md
    SECURITY-HARDENING.md
  framework/
  archive/
```

**Migration:**

- Move `specs/projects/sdk/` → `specs/sdk/` (drop the `projects/` nesting)
- Move standalone docs into `specs/topics/` with descriptive filenames (no INDEX wrappers)
- Archive KMP skeleton docs (`kmp/ARCHITECTURE.md`, `kmp/INITIATIVE.md`, `kmp/REORG-PLAN.md`, `kmp/INDEX.md`) — the real KMP execution spec is `sdk/workstreams/native-shells/SPEC.md`
- Delete `specs/shared/` (only had one file, now in `topics/`)
- Delete empty `specs/projects/` directory
- Update README.md to flat structure

### Change 6: Add CLAUDE.md spec-reading protocol

Add to CLAUDE.md's planning protocol a concrete reading path:

```
To execute a chunk:
1. Read specs/projects/<project>/INDEX.md (find your workstream)
2. Read the workstream SPEC.md (find your chunk)
3. If you need architecture context, read the project OVERVIEW.md
That's it. Do not read framework docs unless you are writing a new spec.
```

This replaces the current "Read README → framework docs → project overview → workstream overview → spec" path.

## Impact

| Metric                               | Before                                         | After                                 | Delta    | How to measure                                        |
| ------------------------------------ | ---------------------------------------------- | ------------------------------------- | -------- | ----------------------------------------------------- |
| Files an agent reads per chunk       | 3-5                                            | 1-2                                   | -60%     | Trace the reading path in CLAUDE.md planning protocol |
| Spec files in repo                   | 30                                             | ~15                                   | -50%     | `find specs -name '*.md' \| wc -l`                    |
| Directory depth to a workstream SPEC | 5 (`specs/projects/sdk/workstreams/x/SPEC.md`) | 4 (`specs/sdk/workstreams/x/SPEC.md`) | -1 level | `find specs -name 'SPEC.md' -exec echo {} \;`         |
| Total spec lines                     | 10,350                                         | ~7,500                                | -27%     | `find specs -name '*.md' -exec cat {} + \| wc -l`     |
| Duplicated north star instances      | 12                                             | 6                                     | -50%     | `rg -c 'North Star' specs/ --glob '!archive/'`        |
| Duplicated rules reminder instances  | 10                                             | 1 (CLAUDE.md)                         | -90%     | `rg -c 'Rules Reminder' specs/ --glob '!archive/'`    |
| "Project" directories                | 5 (sdk, kmp, lottie, euclid, ci)               | 1 (sdk)                               | -80%     | `ls specs/sdk` is the only project                    |

## Execution Plan

### Chunk 1: Consolidate framework into CLAUDE.md and AGENTS.md — S (~2k tokens)

1. Audit PROJECT-RULES.md — diff against CLAUDE.md, add missing rules
2. Audit SPEC-GUIDE.md — move "Writing for AI Agents" essentials to CLAUDE.md planning protocol
3. Add spec-reading protocol to CLAUDE.md
4. Update all AGENTS.md files (`app/AGENTS.md`, `packages/mobile-sdk-alpha/AGENTS.md`, `noir/AGENTS.md`) — remove any references to PROJECT-RULES.md or SPEC-GUIDE.md, ensure they point to CLAUDE.md for rules
5. Archive PROJECT-RULES.md and SPEC-GUIDE.md (move to `specs/archive/`)
6. Validate: grep for references to moved files, update links

### Chunk 2: Merge OVERVIEWs into SPECs — M (~5k tokens)

For each of the 5 workstreams:

1. Extract useful content from OVERVIEW.md (what you own, architecture context, dependencies)
2. Add as `## Context` section at top of SPEC.md (after north star)
3. Remove duplicated north star, rules reminder, spec deviations from SPEC.md
4. Delete OVERVIEW.md
5. Update INDEX.md workstream table

### Chunk 3: Flatten SDK project level — S (~2k tokens)

1. Merge PLAN.md chunk inventory into OVERVIEW.md status section
2. Merge HANDOFF.md open items into OVERVIEW.md. Archive resolved decisions.
3. Delete STATUS.md, PLAN.md, HANDOFF.md
4. Update INDEX.md

### Chunk 4: Strip ceremony from templates — S (~1k tokens)

1. Remove boilerplate sections from TEMPLATES.md
2. Update the template to match the new simplified structure
3. Keep PRODUCT-SPEC-ENHANCEMENT-PROMPT.md (it's a standalone tool, not spec ceremony)

### Chunk 5: Collapse fake projects and flatten hierarchy — M (~4k tokens)

1. `git mv specs/projects/sdk/ specs/sdk/`
2. Move standalone docs to `specs/topics/` with descriptive names:
   - `specs/projects/lottie/REVIEW.md` → `specs/topics/LOTTIE-DOTLOTTIE-REVIEW.md`
   - `specs/projects/euclid/PLAN.md` → `specs/topics/EUCLID-WEB-CONSOLIDATION.md`
   - `specs/projects/ci/COVERAGE-GAPS.md` → `specs/topics/CI-COVERAGE-GAPS.md`
   - `specs/shared/handoffs/SECURITY-HARDENING.md` → `specs/topics/SECURITY-HARDENING.md`
3. Archive KMP skeletons to `specs/archive/kmp/`
4. Delete empty directories: `specs/projects/`, `specs/shared/`, `specs/projects/lottie/`, `specs/projects/euclid/`, `specs/projects/ci/`, `specs/projects/kmp/`
5. Update `specs/README.md` to flat structure
6. Validate: `find specs/projects -type f 2>/dev/null` returns empty (directory gone)

### Chunk 6: Update all cross-references — S (~2k tokens)

1. Grep for all references to deleted/moved files across the entire repo (not just `specs/`)
2. Update links in CLAUDE.md, README.md, all AGENTS.md files (`app/AGENTS.md`, `packages/mobile-sdk-alpha/AGENTS.md`, `noir/AGENTS.md`), and remaining specs
3. Key path changes to grep for:
   - `specs/projects/` → `specs/sdk/` or `specs/topics/`
   - `specs/shared/` → `specs/topics/`
   - `specs/projects/kmp/` → archived
   - `specs/projects/lottie/` → `specs/topics/LOTTIE-DOTLOTTIE-REVIEW.md`
   - `specs/projects/euclid/` → `specs/topics/EUCLID-WEB-CONSOLIDATION.md`
   - `specs/projects/ci/` → `specs/topics/CI-COVERAGE-GAPS.md`
   - Workstream `OVERVIEW.md` → deleted (merged into SPEC.md)
   - `PROJECT-RULES.md`, `SPEC-GUIDE.md` → archived
   - `PLAN.md`, `HANDOFF.md`, `STATUS.md` → merged into OVERVIEW.md
4. Validate with full legacy-path grep (must return zero hits outside `specs/archive/`):

```bash
# Must return empty (no stale references outside archive and this spec)
rg --glob '!specs/archive/**' --glob '!specs/projects/sdk/SPEC-AGENT-OPTIMIZATION.md' \
  -n 'specs/shared/|PROJECT-RULES\.md|SPEC-GUIDE\.md|workstreams/[^/]+/OVERVIEW\.md|/sdk/PLAN\.md|/sdk/HANDOFF\.md|/sdk/STATUS\.md' \
  specs/ CLAUDE.md app/AGENTS.md packages/*/AGENTS.md noir/AGENTS.md

# Verify no dead links — extract all relative markdown links and check they resolve
for f in $(find specs -name '*.md'); do
  dir=$(dirname "$f")
  grep -oP '\[.*?\]\(\K[^)#]+' "$f" 2>/dev/null | while read -r link; do
    [[ "$link" =~ ^https?:// ]] && continue
    target="$dir/$link"
    [ ! -f "$target" ] && echo "BROKEN: $f -> $link"
  done
done
```

## Dependency Graph

```
Chunk 1 (framework → CLAUDE.md + AGENTS.md)
  '---> Chunk 4 (strip templates)
Chunk 2 (merge OVERVIEWs)
Chunk 3 (flatten SDK project level)
Chunk 5 (collapse fake projects)  ← depends on chunk 3 (sdk/ paths must be stable first)
  '---> Chunk 6 (update cross-refs, after 1-5)
```

Chunks 1, 2, 3 can run in parallel. Chunk 4 depends on 1. Chunk 5 depends on 3. Chunk 6 is cleanup after all others.

## Definition of Done

An agent can execute any SDK workstream chunk by reading at most 2 files (`specs/sdk/INDEX.md` + workstream `SPEC.md`), with no duplicated context across files, no process boilerplate in the spec, and no fake project directories to navigate through.

## Risks

| Risk                                            | Mitigation                                                                                                                                               |
| ----------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Losing useful OVERVIEW context during merge     | Extract before deleting — review the merged SPEC.md for completeness                                                                                     |
| CLAUDE.md getting too long                      | Keep rules concise — the file is already ~100 lines, adding ~30 lines of consolidated rules won't bloat it                                               |
| Human spec authors lose guidance                | TEMPLATES.md remains as the reference. Authors who need process guidance can read the archived SPEC-GUIDE.                                               |
| Breaking existing agent workflows               | Chunk 5 catches stale references across entire repo (including AGENTS.md files). The reading path gets simpler, not different.                           |
| KMP skeleton docs have future value             | Archive them — if KMP becomes its own project later, skeletons can be restored. Real KMP execution is already in `sdk/workstreams/native-shells/SPEC.md` |
| Merging PLAN/HANDOFF loses active work tracking | Closure gate: all partial/deferred chunks have next-step descriptions, all P1 handoff items have owner+status before source files are deleted            |

## What This Does NOT Change

- Workstream folder structure (`workstreams/<scope>/`) — stays as-is
- SPEC.md chunk format (goal, steps, I/O, validation) — stays as-is
- OVERVIEW.md at the SDK project level — stays (it's genuinely useful architecture context)
- TEMPLATES.md — stays (simplified but still the copy-paste reference)
- Archive system — stays

## Completion Status

| Chunk | Description                                      | Size | Status   |
| ----- | ------------------------------------------------ | ---- | -------- |
| 1     | Consolidate framework into CLAUDE.md + AGENTS.md | S    | **Done** |
| 2     | Merge OVERVIEWs into SPECs                       | M    | **Done** |
| 3     | Flatten SDK project level                        | S    | **Done** |
| 4     | Strip ceremony from templates                    | S    | **Done** |
| 5     | Collapse fake projects + flatten hierarchy       | M    | **Done** |
| 6     | Update all cross-references                      | S    | **Done** |
