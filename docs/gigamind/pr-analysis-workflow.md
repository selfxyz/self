# PR Analysis Workflow - GigaMind Export

## Overview
This document exports all the neurons related to the PR analysis workflow that fetches PR comments and creates actionable issue files. This workflow is used to analyze GitHub PRs for action items and create comprehensive PR-{{NUMBER}}-ACTION_ITEMS.md files.

## The Prompt to Enable This Workflow

To enable this workflow, use this prompt:

```
giga fetch PR {{NUMBER}} and create an issue file
```

Replace `{{NUMBER}}` with the actual PR number you want to analyze.

## Core Workflow Neuron

### PR Analysis Workflow - v6 #w1x2y3
When analyzing GitHub PRs for action items OR when asked to 'giga fetch PR {{NUMBER}} and create an issue file: 1) Use giga_read_pr to fetch PR data and CodeRabbit comments, 2) Focus on unresolved comments that DON'T have '✅ Addressed' status, 3) Group related issues by root cause (not just severity) - e.g., multiple DOM element issues → single React Native compatibility problem, 4) Prioritize by 'blocking merge' vs 'architectural' vs 'polish', 5) ALWAYS create PR-{{NUMBER}}-ACTION_ITEMS.md in repo root, 6) Use template from docs/templates/pr-action-items-template.md, 7) Focus on specific file paths, line numbers, and clear fixes, 8) Include code examples for complex fixes, 9) Add testing requirements and breaking changes, 10) NEVER use mcp_giga_plan - create real markdown files. An item is 'actionable' if it has: specific file path and line number, clear problem description, specific fix or action required, and priority level (blocking vs non-blocking). Always group related comments by root cause rather than treating each comment separately.

## Supporting Neurons

### PR Testing Status Tracking - v1 #s1t2u3
When creating PR action items, always include a comprehensive testing status section. Track which test suites are passing vs failing, and include specific error messages when available. Common patterns: "yarn workspace @selfxyz/package test" failures, build errors, lint issues. Include both the current status and required actions to fix failing tests. This helps prioritize which issues are blocking vs non-blocking.

### iOS Build Workspace Path Fix - v1 #a1b2c3
The iOS build was failing with "Found no destinations for the scheme OpenPassport" because the fastlane configuration was using the wrong workspace path. The issue was in app/fastlane/Fastfile line 204 where it was constructing the path as "../ios/#{PROJECT_NAME}.xcworkspace" (which became "../ios/Self.xcworkspace") but the actual workspace file is "OpenPassport.xcworkspace". The fix was to hardcode the workspace path to "../ios/OpenPassport.xcworkspace" since the project name (Self) and workspace name (OpenPassport) are different. This is a common issue when the Xcode project name differs from the workspace name.

### Security Template Vulnerabilities - v1 #m4n5o6
When reviewing PR templates or documentation templates, always check for missing security warnings about credential exposure. Common vulnerability: templates that include code example sections without warnings about not pasting secrets, private keys, API tokens, or mnemonics. Always add security notes before code blocks in templates to prevent accidental credential leaks during code reviews.

### iOS Workspace Path Dynamic Resolution - v2 #d4e5f6
The iOS build workspace path should use dynamic resolution based on the scheme name rather than hardcoding. The optimal solution is: workspace_path = File.expand_path("../ios/#{PROJECT_SCHEME}.xcworkspace", Dir.pwd). This approach: 1) Uses the existing IOS_PROJECT_SCHEME environment variable (OpenPassport), 2) Assumes workspace name matches scheme name (OpenPassport.xcworkspace), 3) Is more flexible and maintainable than hardcoding, 4) Follows the pattern where scheme name and workspace name are consistent. This is better than hardcoding or using PROJECT_NAME since the workspace and scheme names match in this project structure.

### Dependency Hoisting Issues - v1 #p7q8r9
When packages import dependencies directly but don't declare them in their own package.json, this can cause hoisting/Metro/ESM resolution issues. Common pattern: package A imports 'uuid' but only package B declares it as dependency. Solution: Add the dependency to the package.json of any workspace that imports it directly. This prevents build failures in certain environments and ensures proper dependency resolution.

### iOS Dependencies Bundle Exec Fix - v1 #g7h8i9
When iOS build fails with "bundler: failed to load command: pod" and missing gem errors, the issue is that the system is trying to use global Ruby gems instead of the project's bundled gems. The solution is to: 1) Run "bundle install" in the app directory to install project dependencies, 2) Use "bundle exec pod install" instead of just "pod install" to ensure the bundled gems are used, 3) Run the command from the ios directory where the Podfile is located. The project uses Bundler to manage Ruby dependencies and has a Gemfile with specific versions of CocoaPods, Fastlane, and other gems. Always use "bundle exec" prefix for Ruby commands in this project to ensure consistent dependency versions.

### Template File Management - v1 #t1u2v3
Template files use kebab-case naming: 'pr-action-items-template.md' (with hyphens), NOT 'pr_action_items_template.md' (with underscores). The template is located at docs/templates/pr-action-items-template.md and should be used to create PR-specific action items files in the repo root as PR-{{NUMBER}}-ACTION_ITEMS.md. This ensures visibility and easy access for all team members reviewing the PR. When searching for or referencing template files, always use the correct kebab-case format.

### Fastlane Workspace Path Robust Resolution - v1 #j1k2l3
The fastlane workspace path resolution should be robust to handle cases where workspace filename differs from scheme name. The implementation should: 1) First try scheme-named workspace (e.g., OpenPassport.xcworkspace for OpenPassport scheme), 2) Fall back to project-named workspace (e.g., Self.xcworkspace for Self project) if scheme-named doesn't exist, 3) Raise a clear error with checked paths if neither exists to fail CI fast. This prevents build failures when workspace and scheme names don't match, and provides clear debugging information when no workspace is found. The logic should be: scheme_workspace_path = File.expand_path("../ios/#{PROJECT_SCHEME}.xcworkspace", Dir.pwd); project_workspace_path = File.expand_path("../ios/#{PROJECT_NAME}.xcworkspace", Dir.pwd); then check File.exist? on each path in order of preference.

### PR Action Items Template - v2 #zfda91
The PR action items template should be value-first and focused on actionable content. Structure: 1) Critical Issues (Blocking Merge) - specific file:line with clear actions, 2) Required Actions - grouped by root cause with specific fixes, 3) Testing Checklist - specific tests to run, 4) Breaking Changes - specific changes and migration needs. Remove generic sections that don't apply to most PRs. Focus on problem → solution → validation pattern. Template location: docs/templates/pr-action-items-template.md, generated files: PR-{{NUMBER}}-ACTION_ITEMS.md in project root. Prioritize actionable items over pretty formatting. Always include specific file paths, line numbers, and code examples for complex fixes.

### Neuron Naming Convention - v1
When creating new neurons, ALWAYS add a unique short hash (6-8 characters) to the end of the title to make neurons easier to find and distinguish. This hash should be unique for EACH neuron and automatically updated when creating new neurons. Use format: "Title - v1 #abc123" or "Title - v2 #def456". This helps with neuron discovery, prevents naming conflicts, and makes it easier to track neuron versions and updates.

### Prefer markdown file lists over plans
Never create plans using the plan tool. Instead, prefer creating markdown file lists for task tracking, documentation, or organized information when needed.

## Template File

The workflow uses this template file located at `docs/templates/pr-action-items-template.md`:

```markdown
<!--
INSTRUCTIONS FOR AGENTS:
- Use giga_read_pr to fetch PR data and CodeRabbit comments
- Focus on unresolved comments without '✅ Addressed' status
- Group related issues by root cause (not just severity)
- Include specific file paths and line numbers
- Provide clear, actionable fixes
- Add code examples for complex issues
- Do not paste or include secrets (API keys, mnemonics, private keys, tokens, credentials) in code blocks or logs; redact sensitive values.
- Prioritize by "blocking merge" vs "architectural" vs "polish"
- Create file as PR-{{NUMBER}}-ACTION_ITEMS.md in project root
-->

# PR {{PR_NUMBER}} Action Items

## Overview
**Title:** {{PR_TITLE}}
**Author:** {{AUTHOR}}
**Status:** {{STATUS}}
**Created:** {{DATE}}
**Branch:** {{BRANCH}}

{{PR_SUMMARY}}

## Critical Issues (Blocking Merge)

### 1. {{ISSUE_TITLE}}
**Files:** `{{FILE_PATH}}:{{LINE_NUMBER}}`
**Problem:** {{PROBLEM_DESCRIPTION}}
**Fix:** {{SPECIFIC_FIX_OR_ACTION}}

### 2. {{ISSUE_TITLE}}
**Files:** `{{FILE_PATH}}:{{LINE_NUMBER}}`
**Problem:** {{PROBLEM_DESCRIPTION}}
**Fix:** {{SPECIFIC_FIX_OR_ACTION}}

## Required Actions

### Issue 1: {{GROUPED_ISSUE_TITLE}}
**Files:** `{{FILE_PATH}}:{{LINE_NUMBER}}`, `{{FILE_PATH}}:{{LINE_NUMBER}}`
**Root Cause:** {{ROOT_CAUSE_DESCRIPTION}}

**Actions:**
- [ ] {{SPECIFIC_ACTION_1}}
- [ ] {{SPECIFIC_ACTION_2}}
- [ ] {{SPECIFIC_ACTION_3}}

**Code Example:**
```{{LANGUAGE}}
{{CODE_EXAMPLE}}
```

### Issue 2: {{GROUPED_ISSUE_TITLE}}
**Files:** `{{FILE_PATH}}:{{LINE_NUMBER}}`
**Root Cause:** {{ROOT_CAUSE_DESCRIPTION}}

**Actions:**
- [ ] {{SPECIFIC_ACTION_1}}
- [ ] {{SPECIFIC_ACTION_2}}

## Testing Checklist

### Before Merge
- [ ] {{SPECIFIC_TEST_TO_RUN}}
- [ ] {{SPECIFIC_VALIDATION}}
- [ ] {{SPECIFIC_BUILD_TEST}}

### Post-Merge
- [ ] {{INTEGRATION_TEST}}
- [ ] {{PERFORMANCE_TEST}}

## Breaking Changes

### For Consumers
- [ ] {{SPECIFIC_BREAKING_CHANGE}}
- [ ] {{MIGRATION_NEEDED}}

### Migration Guide
- [ ] Update import statements
- [ ] Replace deprecated API calls
- [ ] Handle new dependencies

## Implementation Priority

### Phase 1: Critical Fixes (Blocking Merge)
1. {{CRITICAL_FIX_1}}
2. {{CRITICAL_FIX_2}}

### Phase 2: Architecture Improvements
1. {{ARCHITECTURE_FIX_1}}
2. {{ARCHITECTURE_FIX_2}}

### Phase 3: Polish & Documentation
1. {{POLISH_ITEM_1}}
2. {{POLISH_ITEM_2}}

## Notes

- {{SPECIFIC_NOTE_1}}
- {{SPECIFIC_NOTE_2}}
- {{SPECIFIC_NOTE_3}}

---

**Last Updated:** {{DATE}}
```

## Workflow Steps Summary

1. **Fetch PR Data**: Use `giga_read_pr` to get PR details and CodeRabbit comments
2. **Filter Comments**: Focus on unresolved comments without '✅ Addressed' status
3. **Group Issues**: Group related issues by root cause, not just severity
4. **Prioritize**: Categorize as 'blocking merge' vs 'architectural' vs 'polish'
5. **Create File**: Generate PR-{{NUMBER}}-ACTION_ITEMS.md in repo root
6. **Use Template**: Apply the template from docs/templates/pr-action-items-template.md
7. **Include Details**: Add specific file paths, line numbers, and clear fixes
8. **Add Examples**: Include code examples for complex fixes
9. **Add Testing**: Include testing requirements and breaking changes
10. **Avoid Plans**: Never use mcp_giga_plan - create real markdown files

## Key Principles

- **Actionable Items**: Must have specific file path, line number, clear problem description, specific fix, and priority level
- **Root Cause Grouping**: Group related comments by root cause rather than treating each separately
- **Value-First**: Focus on actionable content over pretty formatting
- **Specific Details**: Always include file paths, line numbers, and code examples for complex fixes
- **Testing Focus**: Include comprehensive testing status and requirements

---

**Export Date:** {{CURRENT_DATE}}
**Neuron Count:** 12 neurons exported
**Template Version:** Current as of export
