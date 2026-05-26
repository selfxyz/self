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

- **[React Native Upgrade Plan (Mobile App)](./topics/RN-UPGRADE-PLAN.md)** — staged migration plan from RN 0.77 to supported versions.
- **[RN Upgrade Checklist](./topics/RN-UPGRADE-CHECKLIST.md)** — shared owner/status tracker for coordinating the upgrade across developers.

## Framework

- [Templates](./framework/TEMPLATES.md) — copy-paste templates for all three tiers
- [Spec Execution Model](./framework/SPEC-EXECUTION-MODEL.md) — stable context plus one plan file per PR
- [Product Spec Enhancement Prompt](./framework/PRODUCT-SPEC-ENHANCEMENT-PROMPT.md) — Figma cross-reference agent prompt
- [HTML Spec Practices](./framework/HTML-SPEC-PRACTICES.md) — fonts, palette, layout, interactive open questions, CSS strategy

Project rules and spec-writing guidelines are consolidated in the root `CLAUDE.md`.

## Other

- [Spec Archive](./ARCHIVE.md) — append-only log of retired specs

## Reading Order

1. This file (`specs/README.md`)
2. `specs/projects/sdk/INDEX.md` — find your active workstream or paused native track
3. The workstream `SPEC.md` — find the backlog row and active plan
4. The linked `plans/<BACKLOG-ID>-<slug>.md` file — execute from this file
5. `specs/projects/sdk/OVERVIEW.md` — if you need architecture context
