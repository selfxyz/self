# Specs

> Project-first table of contents for all specs. Start here.

## How Specs Are Organized

Specs are organized by **project** first, not by document intent.

- `specs/projects/<project>/` — project-owned docs and workstreams
- `specs/framework/` — generic spec-writing rules and templates
- `specs/shared/` — cross-project handoffs and coordination

## Projects

- **[SDK](./projects/sdk/INDEX.md)** — architecture, bridge protocol, workstreams (webview, native-shells, integrations, sdk-core, rn-sdk)
- **[KMP](./projects/kmp/INDEX.md)** — KMP initiative, architecture, status, reorg plan
- **[Lottie](./projects/lottie/INDEX.md)** — Lottie to dotLottie migration
- **[Euclid](./projects/euclid/INDEX.md)** — Euclid web consolidation
- **[CI](./projects/ci/COVERAGE-GAPS.md)** — CI coverage gaps

## Framework

- [Spec Guide](./framework/SPEC-GUIDE.md) — how to write specs
- [Templates](./framework/TEMPLATES.md) — copy-paste templates for all three tiers
- [Project Rules](./framework/PROJECT-RULES.md) — project-specific rules and guardrails
- [Product Spec Enhancement Prompt](./framework/PRODUCT-SPEC-ENHANCEMENT-PROMPT.md) — Figma cross-reference agent prompt

## Shared

- [Security Hardening](./shared/handoffs/SECURITY-HARDENING.md) — security follow-ups from handoff

## Other

- [Spec Archive](./ARCHIVE.md) — append-only log of retired specs
- [Specs Reorg Plan](./archive/SPECS-REORG-PLAN.md) — archived reorganization plan and migration map

## Reading Order

1. This file (`specs/README.md`)
2. Your project index under `specs/projects/<project>/`
3. Relevant framework docs in `specs/framework/`
4. Project workstream specs
