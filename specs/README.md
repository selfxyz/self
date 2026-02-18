# Self SDK — Spec System

> Table of contents for the spec folder. Start here.

## What This Is

A three-tier spec system designed for parallel AI agent execution:

1. **Project Overview** — architecture, contracts, cross-workstream dependencies
2. **Workstream Overviews** — orientation for each person/scope (what you own, context, status)
3. **Implementation Specs** — exact code changes, I/O examples, token-budgeted chunks

Specs double as AI agent prompts. Written in second person, sized for single context windows, with validation commands after every chunk.

## Meta-Framework

| File                                   | Purpose                                               | When to Read                            |
| -------------------------------------- | ----------------------------------------------------- | --------------------------------------- |
| [SPEC-GUIDE.md](./SPEC-GUIDE.md)       | How to write specs (generic, portable to any project) | Before writing or reviewing any spec    |
| [TEMPLATES.md](./TEMPLATES.md)         | Copy-paste templates for all three tiers              | When creating a new spec                |
| [PROJECT-RULES.md](./PROJECT-RULES.md) | Project-specific rules and guardrails                 | Before starting any implementation work |

## Project-Level Specs

| File                                 | Purpose                                                                | When to Read                               |
| ------------------------------------ | ---------------------------------------------------------------------- | ------------------------------------------ |
| [SDK-OVERVIEW.md](./SDK-OVERVIEW.md) | Architecture, bridge protocol, module table, decision matrix, glossary | First. Always.                             |
| [WAVE-PLAN.md](./WAVE-PLAN.md)       | Dependency-ordered execution plan for parallel agent work              | When planning which chunks to execute next |

## Workstream Specs

Each workstream has two files: `OVERVIEW.md` (stable orientation) and `SPEC.md` (living implementation details).

| Workstream                             | Overview                                        | Implementation Spec                                           | Status                                          |
| -------------------------------------- | ----------------------------------------------- | ------------------------------------------------------------- | ----------------------------------------------- |
| Person 1 — WebView UI + Bridge         | [OVERVIEW](./person1-webview/OVERVIEW.md)       | [SPEC](./person1-webview/SPEC.md)                             | 4/5 chunks done, 1E in progress                 |
| Person 2 — Native Shells (KMP + Swift) | [OVERVIEW](./person2-native-shells/OVERVIEW.md) | [SPEC](./person2-native-shells/SPEC.md)                       | 3 done, 2 superseded, 1 in progress, 5 pending  |
| Person 3 — Integrations                | [OVERVIEW](./person3-integrations/OVERVIEW.md)  | [MiniPay Spec](./person3-integrations/SPEC-MINIPAY-SAMPLE.md) | 0/3 chunks done                                 |
| Person 4 — SDK Core                    | [OVERVIEW](./person4-sdk-core/OVERVIEW.md)      | [SPEC](./person4-sdk-core/SPEC.md)                            | 4/5 active chunks done (4D skipped), 4F pending |
| Person 5 — RN SDK                      | [OVERVIEW](./person5-rn-sdk/OVERVIEW.md)        | [SPEC](./person5-rn-sdk/SPEC.md)                              | 0/4 chunks done                                 |

## Reading Order

**New to the project?**

1. This README
2. [SDK-OVERVIEW.md](./SDK-OVERVIEW.md) — understand the architecture
3. Your workstream's `OVERVIEW.md` — understand what you own
4. Your workstream's `SPEC.md` — understand what to build

**Starting a work session?**

1. [WAVE-PLAN.md](./WAVE-PLAN.md) — find the next available chunk
2. Your workstream's `SPEC.md` — read the chunk, check status
3. [PROJECT-RULES.md](./PROJECT-RULES.md) — refresh on guardrails

**Writing a new spec?**

1. [SPEC-GUIDE.md](./SPEC-GUIDE.md) — how to write specs
2. [TEMPLATES.md](./TEMPLATES.md) — copy-paste the right template
3. [PROJECT-RULES.md](./PROJECT-RULES.md) — project-specific constraints
