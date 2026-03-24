---
name: pr-summary
description: Generate a GitHub PR title and summary from all branch changes, including Linear issue and Figma links when available.
disable-model-invocation: false
user-invocable: true
argument-hint: '[base-branch (default: main)]'
---

# Generate PR Title and Summary

You generate a concise GitHub PR title and a structured summary covering ALL changes on the current branch compared to the base branch.

## Input

`$ARGUMENTS` — Optional base branch name (default: `main`).

## Workflow

### Step 1: Determine the Base Branch

Use `$ARGUMENTS` if provided, otherwise default to `main`.

Verify the base branch exists:

```bash
git rev-parse --verify <base-branch>
```

If it doesn't exist, ask the user which branch to diff against.

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

If the PR body is empty/whitespace, the title matches the branch name, or the title is a generic default (slug-style text with slashes/hyphens, auto-generated patterns), note that it appears auto-generated.

Show the generated title and body, then ask: "PR #NNN appears to have a template/auto-generated description. Update it?"

If the PR has a meaningful hand-written title and body, show both the current and newly generated versions, then ask: "PR #NNN already has a custom title/description. Replace it?"

If the user confirms, run:

```bash
gh pr edit <number> --title "<title>" --body "<body>"
```

**If no PR exists:**

1. Show the generated title and body clearly:

```
Title: [the title]
```

Then the full body in a fenced code block.

2. Ask the user: "Create this PR?"
3. If the user confirms, run:

```bash
gh pr create --base <base-branch> --title "<title>" --body "<body>"
```

In both cases, if there were uncommitted changes found in Step 2, warn the user about them before proceeding.

## Important Notes

- Always diff against the base branch, not just the previous commit. The PR should describe ALL work on the branch.
- Read the actual diff content — don't just summarize file names. Understand what changed semantically.
- Keep the summary concise. The diff is available in the PR; the summary should help reviewers understand intent and scope quickly.
- Always ask before creating or updating a PR. Never run `gh pr create` or `gh pr edit` without user confirmation.
- Never run `git push`. The user handles pushing themselves. If the branch is not pushed, remind them to push first.
