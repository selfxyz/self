# Specs

> Project-first table of contents for all specs. Start here.

## How Specs Are Organized

Specs are organized by **project** first (`kmp`, `sdk`, `lottie`, `euclid`), not by document intent.

- Use `specs/projects/<project>/` for project-owned docs.
- Use `specs/framework/` for generic spec-writing rules/templates.
- Use `specs/shared/` for cross-project handoffs.

## Top-Level Navigation

- `framework/`
  - `SPEC-GUIDE.md`
  - `TEMPLATES.md`
  - `PROJECT-RULES.md`
  - `PRODUCT-SPEC-ENHANCEMENT-PROMPT.md`

- `projects/sdk/`
  - SDK-wide architecture, wave plan, handoff, and workstreams

- `projects/kmp/`
  - KMP initiative, architecture, status, and KMP-specific planning

- `projects/lottie/`
  - Lottie migration/review specs

- `projects/euclid/`
  - Euclid consolidation specs

- `shared/handoffs/`
  - Cross-project security and transition docs

## Current Canonical Entry Points

- SDK: `specs/projects/sdk/INDEX.md` (planned)
- KMP: `specs/projects/kmp/KMP-SPECS-INDEX.md`
- Folder migration: `specs/SPECS-REORG-PLAN.md`

## Migration Map (Legacy -> Target)

- `specs/SDK-OVERVIEW.md` -> `specs/projects/sdk/SDK-OVERVIEW.md`
- `specs/WAVE-PLAN.md` -> `specs/projects/sdk/WAVE-PLAN.md`
- `specs/HANDOFF.md` -> `specs/projects/sdk/HANDOFF.md`

- `specs/person1-webview/*` -> `specs/projects/sdk/workstreams/webview/*`
- `specs/person2-native-shells/*` -> `specs/projects/sdk/workstreams/native-shells/*`
- `specs/person3-integrations/*` -> `specs/projects/sdk/workstreams/integrations/*`
- `specs/person4-sdk-core/*` -> `specs/projects/sdk/workstreams/sdk-core/*`
- `specs/person5-rn-sdk/*` -> `specs/projects/sdk/workstreams/rn-sdk/*`

- `specs/KMP-STATUS.md` -> `specs/projects/kmp/status/KMP-STATUS.md`
- `specs/lottie-dotlottie-migration/REVIEW.md` -> `specs/projects/lottie/REVIEW.md`
- `specs/EUCLID-WEB-CONSOLIDATION.md` -> `specs/projects/euclid/EUCLID-WEB-CONSOLIDATION.md`
- `specs/handoff-p1-fixes/*` -> `specs/shared/handoffs/p1-fixes/*`

## Reading Order

1. `specs/README.md`
2. Your project index under `specs/projects/<project>/`
3. Relevant framework docs in `specs/framework/`
4. Project workstream specs
