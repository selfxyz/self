# Specs

> Table of contents for all specs. Start here.

## How Specs Are Organized

- `specs/projects/` — active project specs you implement against
- `specs/topics/` — standalone docs (not full projects)
- `specs/framework/` — templates for writing new specs
- `specs/archive/` — retired specs

## Projects

- **[SDK](./projects/sdk/INDEX.md)** — active WebView-first scope, paused native tracks, execution status

## Topics

- [CI Coverage Gaps](./archive/CI-COVERAGE-GAPS.md)
- [Euclid Web Consolidation](./topics/EUCLID-WEB-CONSOLIDATION.md)
- [Lottie dotLottie Review](./topics/LOTTIE-DOTLOTTIE-REVIEW.md)
- [Security Hardening](./topics/SECURITY-HARDENING.md)

## Framework

- [Templates](./framework/TEMPLATES.md) — copy-paste templates for all three tiers
- [Spec Execution Model](./framework/SPEC-EXECUTION-MODEL.md) — stable context plus one plan file per PR
- [Product Spec Enhancement Prompt](./framework/PRODUCT-SPEC-ENHANCEMENT-PROMPT.md) — Figma cross-reference agent prompt

Project rules and spec-writing guidelines are consolidated in the root `CLAUDE.md`.

## Other

- [Spec Archive](./ARCHIVE.md) — append-only log of retired specs

## Reading Order

1. This file (`specs/README.md`)
2. `specs/projects/sdk/INDEX.md` — find your active workstream or paused native track
3. The workstream `SPEC.md` — find the backlog row and active plan
4. The linked `plans/<BACKLOG-ID>-<slug>.md` file — execute from this file
5. `specs/projects/sdk/OVERVIEW.md` — if you need architecture context
