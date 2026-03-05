# KMP Specs and DX Reorganization Plan

Last updated: March 5, 2026
Owner: KMP program
Status: Proposed

## Objective

Reorganize KMP specs and developer experience surface areas so contributors and agents can find the right docs quickly, run the right commands consistently, and execute changes with clear ownership boundaries.

## Success Criteria

- KMP specs are grouped by project intent under a dedicated KMP project tree.
- KMP package naming is consistent (`kmp-sdk`, `kmp-sdk-test-app` folder naming).
- Root command surface is explicit, discoverable, and backward-compatible during migration.
- Architecture and initiative docs exist and become the canonical KMP entrypoints.
- Agents can navigate and execute work with minimal ambiguity.

## Naming and Structure Standards

1. Package naming standard

- Keep SDK package as `kmp-sdk`.
- Rename test host app folder from `kmp-test-app` to `kmp-sdk-test-app`.
- Keep workspace package name as `@selfxyz/kmp-test-app` (no package rename).

2. Spec naming standard

- Use `KMP-` prefix for KMP-wide docs.
- Use `KMP-<TRACK>-<TOPIC>.md` for scoped docs (example: `KMP-NATIVE-API.md`).

3. Canonical KMP spec tree

- `specs/projects/kmp/README.md`
- `specs/projects/kmp/ARCHITECTURE.md`
- `specs/projects/kmp/INITIATIVE.md`
- `specs/projects/sdk/STATUS.md` (relocated — SDK-wide status)
- `specs/projects/kmp/workstreams/*`
- `specs/projects/kmp/INDEX.md`
- `specs/projects/kmp/KMP-DECISIONS.md`
- `specs/projects/kmp/KMP-CHANGELOG.md`

## Command Surface Reorganization

Update root `package.json` KMP scripts into explicit namespaces:

1. SDK commands

- `kmp:sdk:build`
- `kmp:sdk:test`
- `kmp:sdk:lint`
- `kmp:sdk:format`
- `kmp:sdk:clean`

2. Test app commands

- `kmp:test-app:android`
- `kmp:test-app:ios`
- `kmp:test-app:build`
- `kmp:test-app:test`
- `kmp:test-app:lint`
- `kmp:test-app:format`
- `kmp:test-app:clean`

3. Orchestration commands

- `kmp:all:check` (lint + test + build)
- `kmp:all:clean`
- `kmp:all:dev`

4. Backward compatibility

- Keep existing `kmp:*` aliases mapped to new commands for 1-2 release cycles.
- Add deprecation notes in script descriptions and docs.

## Required New Docs

1. `ARCHITECTURE.md`

- Module boundaries and ownership
- Runtime flow diagrams (Android/iOS)
- Bridge contract and handler lifecycle
- Integration points with RN SDK/WebView artifacts
- Risk areas and validation matrix

2. `INITIATIVE.md`

- Problem statement
- Goals and non-goals
- Milestones and deliverables
- Owners and decision records
- Rollout and acceptance criteria

## Agent-Focused Spec Hygiene

Add the following to each KMP workstream spec:

- `Owner`
- `Depends On`
- `Inputs`
- `Outputs`
- `Safe-to-edit paths`
- `Do-not-edit paths`
- `Validation commands`
- `Last verified` date

Add a lightweight validator script to enforce required headings in KMP spec files.

## Migration Plan

### Phase 1: Foundations

- Create KMP spec project tree under `specs/projects/kmp/`.
- Add `ARCHITECTURE.md` and `INITIATIVE.md` skeletons.
- Publish `INDEX.md` as the KMP entrypoint.

Exit criteria:

- KMP entry docs exist and are linked from `specs/README.md`.

### Phase 2: Command Taxonomy

- Add new namespaced KMP commands to root `package.json`.
- Add compatibility aliases from old `kmp:*` commands.
- Document command matrix (`task -> command -> expected output`).

Exit criteria:

- All existing KMP workflows work through new commands.

### Phase 3: Package Folder Rename

- Rename folder `packages/kmp-test-app` to `packages/kmp-sdk-test-app`.
- Keep workspace package name as `@selfxyz/kmp-test-app`.
- Update all path references in scripts, Gradle settings, docs, and specs.

Exit criteria:

- No path references remain to `packages/kmp-test-app`.
- Workspace package name remains unchanged.

### Phase 4: Spec Migration

- Move KMP-relevant specs into `specs/projects/kmp/` buckets.
- Add compatibility index in root `specs/README.md` mapping old paths to new paths.
- Add `KMP-CHANGELOG.md` and `KMP-DECISIONS.md`.

Exit criteria:

- KMP spec navigation starts at one path and old references are redirected.

### Phase 5: Deprecation Cleanup

- Remove old command aliases after signoff window.
- Remove transitional links once references converge.
- Run full lint/types/build/tests for impacted workspaces.

Exit criteria:

- No transitional aliases or duplicate KMP spec locations remain.

## Risks and Mitigations

1. Broken references after rename

- Mitigation: perform repo-wide search/replace + validation pass before merge.

2. Temporary confusion during command transition

- Mitigation: keep aliases and publish command matrix with examples.

3. Spec drift after migration

- Mitigation: add `Last verified` and heading-validator checks in CI.

## Validation Checklist

- `yarn lint`
- `yarn types`
- `yarn build`
- `yarn test`
- `rg -n "packages/kmp-test-app" .`
- `rg -n "specs/projects/kmp" specs/README.md`

## Immediate Next Actions

1. Create architecture and initiative doc skeletons in `specs/projects/kmp/`.
2. Add new root KMP command taxonomy with alias compatibility.
3. Prepare and execute package folder rename in one focused PR.
4. Migrate KMP specs and add redirect mapping.
