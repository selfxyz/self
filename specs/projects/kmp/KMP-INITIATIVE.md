# KMP Initiative

Last updated: March 5, 2026
Owner: KMP program
Status: Draft

## Problem Statement

KMP specs and DX entrypoints are currently fragmented across mixed naming and locations, increasing onboarding time and execution errors for contributors and agents.

## Goals

- Standardize KMP naming across packages, commands, and specs.
- Consolidate KMP specs under one project-intent hierarchy.
- Establish architecture and initiative docs as canonical entrypoints.
- Improve agent execution reliability with explicit ownership and validation.

## Non-Goals

- Redesigning non-KMP project spec systems in this initiative.
- Reworking product requirements outside KMP scope.

## Deliverables

1. KMP spec tree under `specs/projects/kmp/`
2. Command taxonomy (`kmp:sdk:*`, `kmp:test-app:*`, `kmp:all:*`)
3. Package/workspace rename to `kmp-sdk-test-app`
4. Migration map from legacy paths and command aliases
5. Agent hygiene fields enforced in KMP workstream specs

## Milestones

1. Foundation docs

- `KMP-SPECS-INDEX.md`
- `KMP-ARCHITECTURE.md`
- `KMP-INITIATIVE.md`

2. Command migration

- Add new namespaced commands
- Keep compatibility aliases

3. Naming migration

- Folder/workspace rename for test app
- Repo-wide reference update

4. Spec migration

- Move KMP-relevant docs into new hierarchy
- Add redirects/mapping

5. Cleanup

- Remove deprecated aliases after signoff window

## Owners

- Initiative lead: _TBD_
- DX/commands: _TBD_
- Specs migration: _TBD_
- Validation/CI: _TBD_

## Dependencies

- Agreement on final package naming
- Agreement on command namespace policy
- Coordination with ongoing KMP implementation work

## Risks

1. Stale links and references after migration
2. Temporary confusion during alias period
3. Spec drift without ownership/date stamping

## Acceptance Criteria

- New KMP entrypoint exists and is linked from top-level specs index.
- New commands cover all existing KMP workflows.
- Legacy references are either migrated or mapped.
- KMP specs include owner/dependencies/validation metadata.

## Rollout Plan

1. Land docs and command taxonomy.
2. Land package/workspace rename.
3. Land spec migration and mapping.
4. Remove deprecated aliases after agreed window.

## Change Log

- 2026-03-05: Initial initiative skeleton created.
