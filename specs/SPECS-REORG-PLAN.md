# Specs Folder Reorganization Plan (Project-First)

Last updated: March 5, 2026
Owner: SDK/specs maintainers
Status: Proposed

## Decision

Use a **project-first** structure for `specs/`.

Why:

- Work typically starts from project context (`kmp`, `lottie`, `sdk`, `euclid`).
- Agents can resolve scope faster with one project root.
- Cross-project docs are the minority and can live in shared buckets.

## Goals

- Make each project's docs discoverable under one folder.
- Keep generic authoring rules separate from project specs.
- Reduce mixed flat files and stale links.
- Preserve compatibility during migration with path mapping.

## Target Structure

```text
specs/
  README.md
  SPECS-REORG-PLAN.md

  framework/
    SPEC-GUIDE.md
    TEMPLATES.md
    PROJECT-RULES.md
    PRODUCT-SPEC-ENHANCEMENT-PROMPT.md

  projects/
    sdk/
      INDEX.md
      SDK-OVERVIEW.md
      WAVE-PLAN.md
      HANDOFF.md
      workstreams/
        webview/
        native-shells/
        integrations/
        sdk-core/
        rn-sdk/

    kmp/
      INDEX.md
      KMP-ARCHITECTURE.md
      KMP-INITIATIVE.md
      KMP-REORG-PLAN.md
      status/
        KMP-STATUS.md
      workstreams/

    lottie/
      INDEX.md
      REVIEW.md

    euclid/
      INDEX.md
      EUCLID-WEB-CONSOLIDATION.md

  shared/
    handoffs/
      p1-fixes/
        SECURITY-HARDENING.md

  archive/
    ARCHIVE.md          # append-only table of retired specs
    sdk/                # full-text copies of retired SDK specs (optional)
    kmp/                # full-text copies of retired KMP specs (optional)
```

## Placement Rules

1. If a spec is mainly about one project, place it under `specs/projects/<project>/`.
2. Only generic spec system docs go in `specs/framework/`.
3. Cross-project coordination and follow-ups go in `specs/shared/`.
4. Every project folder should have an `INDEX.md` as its entrypoint.
5. New implementation specs should include: `Owner`, `Status`, `Last updated`, `Validation commands`.
6. When a spec is fully done: add a row to `specs/ARCHIVE.md` with outcome + key decisions. Either delete the source files (if the "What Was Built" appendix was added per SPEC-GUIDE) or move them to `specs/archive/<project>/`. Workstream OVERVIEW.md files stay until the workstream itself is retired.

## Migration Map (Current -> Target)

Framework:

- `specs/SPEC-GUIDE.md` -> `specs/framework/SPEC-GUIDE.md`
- `specs/TEMPLATES.md` -> `specs/framework/TEMPLATES.md`
- `specs/PROJECT-RULES.md` -> `specs/framework/PROJECT-RULES.md`
- `specs/PRODUCT-SPEC-ENHANCEMENT-PROMPT.md` -> `specs/framework/PRODUCT-SPEC-ENHANCEMENT-PROMPT.md`

SDK project:

- `specs/SDK-OVERVIEW.md` -> `specs/projects/sdk/SDK-OVERVIEW.md`
- `specs/WAVE-PLAN.md` -> `specs/projects/sdk/WAVE-PLAN.md`
- `specs/HANDOFF.md` -> `specs/projects/sdk/HANDOFF.md`
- `specs/person1-webview/*` -> `specs/projects/sdk/workstreams/webview/*`
- `specs/person2-native-shells/*` -> `specs/projects/sdk/workstreams/native-shells/*`
- `specs/person3-integrations/*` -> `specs/projects/sdk/workstreams/integrations/*`
- `specs/person4-sdk-core/*` -> `specs/projects/sdk/workstreams/sdk-core/*`
- `specs/person5-rn-sdk/*` -> `specs/projects/sdk/workstreams/rn-sdk/*`

KMP project:

- `specs/KMP-STATUS.md` -> `specs/projects/kmp/status/KMP-STATUS.md`
- `specs/projects/kmp/KMP-*.md` -> keep under `specs/projects/kmp/`

Lottie project:

- `specs/lottie-dotlottie-migration/REVIEW.md` -> `specs/projects/lottie/REVIEW.md`

Euclid project:

- `specs/EUCLID-WEB-CONSOLIDATION.md` -> `specs/projects/euclid/EUCLID-WEB-CONSOLIDATION.md`

Shared:

- `specs/handoff-p1-fixes/*` -> `specs/shared/handoffs/p1-fixes/*`

## Rollout Phases

### Phase 1: Index and Policy

- Update `specs/README.md` to project-first navigation.
- Keep a migration mapping table in `README` during transition.

### Phase 2: Create Target Dirs

- Create `framework/`, `projects/*`, `shared/` roots.
- Add `INDEX.md` placeholders for `sdk`, `kmp`, `lottie`, `euclid`.

### Phase 3: Move Project-Level Docs

- Move `SDK-OVERVIEW`, `WAVE-PLAN`, `HANDOFF`, KMP status, lottie review, euclid consolidation.
- Update links in moved docs.

### Phase 4: Move Workstreams

- Move `person*` directories to `projects/sdk/workstreams/*`.
- Update references from old paths.

### Phase 5: Cleanup

- Remove old-path mapping table after link convergence.
- Add optional metadata validation script for required headings.

## Validation Checklist

- `find specs -maxdepth 5 -type f | sort`
- `rg -n "person[1-5]-|KMP-STATUS.md|lottie-dotlottie-migration|EUCLID-WEB-CONSOLIDATION" specs`
- `rg -n "\]\(\./" specs` (relative-link sanity)

## Immediate Next Steps

1. Create project `INDEX.md` files for `sdk`, `kmp`, `lottie`, `euclid`.
2. Move `KMP-STATUS.md` into `projects/kmp/status/`.
3. Move `lottie-dotlottie-migration/REVIEW.md` into `projects/lottie/`.
4. Move `EUCLID-WEB-CONSOLIDATION.md` into `projects/euclid/`.
