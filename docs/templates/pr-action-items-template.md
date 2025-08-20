<!--
INSTRUCTIONS FOR AGENTS:
- Use giga_read_pr to fetch PR data and CodeRabbit comments
- Focus on unresolved comments without '✅ Addressed' status
- Group related issues by root cause (not just severity)
- Include specific file paths and line numbers
- Provide clear, actionable fixes
- Add code examples for complex issues
- Prioritize by "blocking merge" vs "architectural" vs "polish"
- Create file as PR-{{NUMBER}}-ACTION-ITEMS.md in project root
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
