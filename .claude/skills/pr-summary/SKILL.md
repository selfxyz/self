---
name: pr-summary
description: Generate a GitHub PR title and summary from all branch changes, including Linear issue and Figma links when available. When targeting staging, generates a release changelog instead.
disable-model-invocation: false
user-invocable: true
argument-hint: '[base-branch (default: dev)]'
---

# Generate PR Title and Summary

You generate a concise GitHub PR title and a structured summary covering ALL changes on the current branch compared to the base branch.

When the target branch is `staging`, you switch to **changelog mode** — generating release notes from merged PRs instead of a single PR summary.

## Input

`$ARGUMENTS` — Optional base branch name (default: `dev`).

## Workflow

### Step 1: Determine the Base Branch

Use `$ARGUMENTS` if provided, otherwise default to `dev`.

Verify the base branch exists:

```bash
git rev-parse --verify <base-branch>
```

If it doesn't exist, ask the user which branch to diff against.

### Step 1.5: Detect Changelog Mode

Switch to **Changelog Mode** (skip to the Changelog Mode section below) if ANY of these are true:

- The base branch argument is or contains `staging` (e.g., `staging`, `release/staging-2026-04-09`)
- The **current branch** name contains `staging` or matches `release/staging-*`
- The user explicitly asks for a changelog or release notes

When changelog mode activates and no explicit base branch was provided, auto-detect the base by diffing against `dev`. If the current branch *is* `dev`, diff against `main`.

Otherwise, continue with the normal PR summary workflow.

### Step 2: Gather All Branch Changes

Run these commands to understand the FULL scope of changes on this branch (not just the latest commit):

1. **Commit log** — all commits since diverging from the base branch:

```bash
git log <base-branch>..HEAD --oneline --no-decorate
```

2. **Full diff stat** — files changed summary:

```bash
git diff <base-branch>...HEAD --stat
```

3. **Full diff** — the actual changes (read this carefully, it is the source of truth for the summary):

```bash
git diff <base-branch>...HEAD
```

4. **Unstaged/untracked changes** — anything not yet committed:

```bash
git status -s
```

If there are uncommitted changes, note them separately in the output so the user knows they won't be in the PR.

### Step 3: Scan for Linear Issue References

Search for Linear issue references in:

1. **Commit messages** — look for patterns like `SELF-XXXX`, `[SELF-XXXX]`, or Linear URLs
2. **Branch name** — the current branch name may contain an issue ID or slug
3. **Changed file content** — scan diff for Linear issue URLs or IDs in comments/docs
4. **Spec docs** — scan `specs/` for markdown files that reference the files changed on this branch. Cross-reference the changed file paths from `git diff --name-only` against the spec content to find the relevant issues.

For each Linear issue found, fetch its details:

- Call `mcp__linear-server__get_issue` with the issue ID
- Extract: title, status, URL, parent issue (if any)

If no Linear issues are found, skip this section in the output.

### Step 4: Scan for Figma References

Search for Figma resource links in:

1. **Changed file content** — scan the diff for `figma.com` URLs
2. **Linear issues found in Step 3** — check their descriptions for Figma links
3. **Commit messages** — look for Figma URLs

Collect unique Figma URLs with brief context (which screen/component they relate to).

If no Figma links are found, skip this section in the output.

### Step 5: Categorize the Changes

Group changes into categories based on what was modified:

- **React Native app** — changes under `app/`
- **SDK core** — changes under `packages/mobile-sdk-alpha/`
- **WebView app** — changes under `packages/webview-app/`
- **WebView bridge** — changes under `packages/webview-bridge/`
- **KMP SDK** — changes under `packages/kmp-sdk/`
- **Native shells** — changes under `packages/native-shell-android/` or `packages/native-shell-ios/`
- **RN SDK** — changes under `packages/rn-sdk/`
- **Noir circuits** — changes under `noir/` or `circuits/`
- **Contracts** — changes under `contracts/`
- **Common/shared** — changes under `common/` or `new-common/`
- **Tests** — test files added or modified (`.test.ts`, `.spec.ts`, etc.)
- **Assets** — images, Lottie JSON, sounds added or renamed
- **Docs/specs** — changes to `docs/`, `specs/`, `CLAUDE.md`, or other markdown
- **Config/infra** — `package.json`, `tsconfig`, CI, scripts, patches, etc.

Only include categories that have changes. Collapse small categories (1-2 files) together if it aids readability.

### Step 6: Generate the PR Title

Rules:

- Under 70 characters
- Lead with the action verb: `add`, `update`, `fix`, `remove`, `refactor`, `rename`
- Describe the overall intent, not individual files
- Do not include issue IDs in the title

### Step 7: Generate the PR Summary

Output the complete PR body using this format:

```markdown
## Summary

[2-4 bullet points covering the most important changes. Focus on the "what" and "why", not file-by-file details.]

## Changes

### [Category Name]

- [change description]
- [change description]

### [Category Name]

- [change description]

## Linear Issues

- Closes [SELF-XXXX](url) — [title]

## Figma

- [brief context](figma-url)

## Test Plan

- [ ] `yarn lint && yarn types` passes
- [ ] [package-specific validation commands as relevant]
- [ ] [any manual verification steps specific to these changes]

🤖 Generated with [Claude Code](https://claude.com/claude-code)
```

Omit the "Linear Issues" section if none were found.
Omit the "Figma" section if no Figma links were found.

If the diff touches native paths (`app/`, `packages/native-shell-*`, `packages/kmp-sdk/`, iOS/Android project files), append this checklist to the Test Plan section:

```markdown
### Native Consolidation Checklist

- [ ] CONTRACTS.md reviewed - no unintended contract changes
- [ ] Layer 1 bridge contract tests pass (`cd app && yarn jest:run` / `yarn workspace @selfxyz/rn-sdk-test-app test`)
- [ ] Layer 3 builds pass (app iOS, RN test app iOS, RN test app Android)
- [ ] Layer 4 manual smoke test signed off (if consolidation PR)
- [ ] No new native business logic added (logic belongs in TypeScript)
```

### Step 8: Check for Existing PR

Check if a PR already exists for the current branch:

```bash
gh pr view --json number,title,url 2>/dev/null
```

**If a PR exists:**

First, fetch the current PR title and body:

```bash
gh pr view --json number,title,body,url
```

Update the PR directly — do not ask for confirmation. Run:

```bash
gh pr edit <number> --title "<title>" --body "<body>"
```

Then show the updated title and link.

**Exception:** If the PR already has a meaningful hand-written title and body (not a template or auto-generated slug), do NOT overwrite it automatically. Show both the current and newly generated versions and ask whether to replace it — hand-written descriptions are the one case worth confirming before clobbering.

**If no PR exists:**

Create the PR directly — do not ask for confirmation. Run:

```bash
gh pr create --base <base-branch> --title "<title>" --body "<body>"
```

Then show the new PR link.

In both cases, if there were uncommitted changes found in Step 2, warn the user about them after acting so they know what isn't yet reflected in the PR.

## Important Notes

- Always diff against the base branch, not just the previous commit. The PR should describe ALL work on the branch.
- Read the actual diff content — don't just summarize file names. Understand what changed semantically.
- Keep the summary concise. The diff is available in the PR; the summary should help reviewers understand intent and scope quickly.
- Create or update the PR directly once the summary is generated — don't ask for confirmation. The only exception is overwriting an existing meaningful, hand-written title/body (see Step 8), which should be confirmed first.
- Never run `git push`. The user handles pushing themselves. If the branch is not pushed, remind them to push first.

---

## Changelog Mode

This mode activates when the base branch is `staging`. It generates user-facing release notes from PRs merged into the current branch since it diverged from staging, focused on mobile app changes.

### Changelog Step 1: Determine the Range

Determine the comparison base. The goal is to find what's new on the staging/release branch:

1. If a specific base branch was provided and exists, use it.
2. If the current branch is a staging/release branch (e.g., `release/staging-*`), diff against `dev`.
3. If the current branch is `dev`, diff against `main`.

```bash
git log <comparison-base>..HEAD --oneline --no-decorate
```

Next, find merged PRs that make up this release. Extract PR numbers from merge commits:

```bash
git log <comparison-base>..HEAD --merges --oneline
```

Parse PR numbers from merge commit messages (patterns like `(#1234)`) and fetch each PR's details:

```bash
gh pr view <number> --json number,title,body,labels,mergedAt
```

Also try listing PRs merged into the current branch directly:

```bash
gh pr list --base <current-branch> --state merged --json number,title,body,mergedAt,labels,headRefName --limit 100
```

### Changelog Step 2: Gather the Diff

Get the full diff to understand what actually changed:

```bash
git diff <comparison-base>...HEAD --stat
git diff <comparison-base>...HEAD
```

### Changelog Step 3: Identify Mobile App Impact

For each PR or commit group, determine if it affects the mobile app user experience. Prioritize changes that touch:

- **`app/`** — direct app changes (screens, navigation, components, assets)
- **`packages/mobile-sdk-alpha/`** — SDK changes that affect app behavior
- **`packages/webview-app/`** — WebView screens shown in the app
- **`packages/webview-bridge/`** — bridge changes that affect app functionality
- **`packages/rn-sdk/`** — React Native SDK changes

Deprioritize (but don't ignore) changes that are purely:
- CI/config/infra
- Docs/specs only
- Test-only changes
- Internal refactors with no user-facing impact

### Changelog Step 4: Scan for Linear Issues

Search commit messages and PR titles/bodies for Linear issue references (`SELF-XXXX`). For each found, fetch details:

- Call `mcp__linear-server__get_issue` with the issue ID
- Use the issue title to improve changelog entry descriptions

### Changelog Step 5: Categorize Changes

Group changes into user-facing categories:

- **New** — new features, screens, flows, or capabilities
- **Improved** — enhancements to existing features, UX improvements, performance
- **Fixed** — bug fixes, crash fixes, regression fixes
- **Removed** — removed features or deprecated functionality
- **Internal** — refactors, renames, dependency updates (collapse into a single bullet or omit if no user-facing impact)

Use the PR titles, Linear issue titles, and the actual diff to write entries. Each entry should be:
- Written for a non-technical audience (app users / stakeholders)
- One line, focused on the user-visible outcome
- Free of implementation details (no file paths, function names, or technical jargon)

### Changelog Step 6: Generate the Changelog

Output using this format:

```markdown
## What's New — [version or date range]

### New
- [feature description]

### Improved
- [improvement description]

### Fixed
- [fix description]

### Removed
- [removal description]

---

<details>
<summary>Internal changes</summary>

- [internal change]

</details>

### Linear Issues
- [SELF-XXXX](url) — [title]

🤖 Generated with [Claude Code](https://claude.com/claude-code)
```

Omit any category that has no entries. The "Internal changes" section is collapsed by default.

If no version tag is available, use the date range of the merged PRs (e.g., "Mar 28 – Apr 9, 2026").

### Changelog Step 7: Check for Existing PR

Same as Step 8 in the normal flow — check for an existing PR, then create or update it directly without asking (the lone exception being an existing meaningful, hand-written description, which should be confirmed before overwriting). Use the changelog as the PR body instead of the normal summary format.

For the PR title in changelog mode, use: `Release: [version or date range summary]` (e.g., `Release: account recovery, nav fixes, platform renaming`).
