<!--
INSTRUCTIONS FOR AGENTS:

CRITICAL FILTERING RULES - MUST FOLLOW EXACTLY:
1. ONLY include comments that meet ALL criteria:
   ✅ NO "✅ Addressed" status (must be truly unresolved)
   ✅ NO "nitpick" or "suggestion" labels (medium+ severity only)
   ✅ MEDIUM to CRITICAL impact (affects functionality, security, or architecture)
   ✅ NOT cosmetic/style issues (unless security/performance related)
   ✅ DO NOT include secrets, access tokens, API keys, private keys, MRZ data, or any PII. Redact sensitive values and replace with placeholders.

2. VERIFICATION PROCESS - MANDATORY:
   - Read EACH comment's status field carefully
   - Check for "✅ Addressed in commits X to Y" text
   - Verify comment type: "🛠️ Refactor suggestion", "⚠️ Potential issue", etc.
   - Exclude: style, formatting, naming, documentation-only suggestions
   - Include: security, memory leaks, breaking changes, API inconsistencies, platform compatibility

3. SEVERITY CLASSIFICATION:
   - CRITICAL: Security vulnerabilities, memory leaks, breaking platform compatibility
   - HIGH: API inconsistencies, type safety issues, significant architectural problems
   - MEDIUM: Test coverage gaps, minor architectural improvements, performance concerns
   - LOW/NITPICK: Style, naming, documentation, minor suggestions (EXCLUDE THESE)

4. DOUBLE-CHECK PROCESS:
   - After initial analysis, re-read ALL comments
   - Verify each "unresolved" issue is actually unresolved
   - Remove any that have been addressed in subsequent commits
   - If NO unresolved medium+ issues exist, state "All issues resolved ✅"
   - Run a final pass to ensure no credentials, secrets, or PII are present in examples, logs, or screenshots.

5. EXECUTION:
   - Use giga_read_pr to fetch PR data and CodeRabbit comments
   - Group related issues by root cause (not just severity)
   - Include specific file paths and line numbers from CodeRabbit metadata
   - Provide clear, actionable fixes with code examples
   - Prioritize by "blocking merge" vs "architectural" vs "polish"
   - Create file as PR-{{NUMBER}}-ACTION-ITEMS.md in project root
   - Follow gitignore pattern: PR-*-ACTION*.md
-->

# PR {{PR_NUMBER}} Action Items

## Overview
**Title:** {{PR_TITLE}}
**Author:** {{AUTHOR}}
**Status:** {{STATUS}}
**Created:** {{DATE}}
**Branch:** {{BRANCH}}

{{PR_SUMMARY}}

## Analysis Summary

<!-- IF ALL ISSUES RESOLVED, USE THIS SECTION: -->
**After thorough review of all {{TOTAL_COMMENTS}} CodeRabbit comments, ALL issues have been resolved in subsequent commits. The PR is ready for merge.**

### Resolved Comments ✅ ({{TOTAL_COMMENTS}}/{{TOTAL_COMMENTS}})
All comments show ✅ "Addressed" status, indicating they were fixed in commits:
- {{RESOLVED_CATEGORY_1}} - Fixed in commits {{COMMIT_RANGE}}
- {{RESOLVED_CATEGORY_2}} - Fixed in commits {{COMMIT_RANGE}}

### Unresolved Comments 🔴 (0/{{TOTAL_COMMENTS}})
**None** - All comments have been addressed.

## Conclusion
**This PR is ready for merge.** All CodeRabbit issues have been resolved.

<!-- IF UNRESOLVED ISSUES EXIST, USE SECTIONS BELOW INSTEAD: -->

## Critical Issues (Blocking Merge)

<!-- ONLY include if there are ACTUAL unresolved medium+ severity issues -->

### 1. {{ISSUE_TITLE}}
**Files:** `{{FILE_PATH}}:{{LINE_NUMBER}}`
**CodeRabbit Comment:** {{COMMENT_ID}}
**Problem:** {{PROBLEM_DESCRIPTION}}
**Fix:** {{SPECIFIC_FIX_OR_ACTION}}

**Code Example:**
```{{LANGUAGE}}
{{CODE_EXAMPLE}}
```

### 2. {{ISSUE_TITLE}}
**Files:** `{{FILE_PATH}}:{{LINE_NUMBER}}`
**CodeRabbit Comment:** {{COMMENT_ID}}
**Problem:** {{PROBLEM_DESCRIPTION}}
**Fix:** {{SPECIFIC_FIX_OR_ACTION}}

## Required Actions

### Issue 1: {{GROUPED_ISSUE_TITLE}}
**Root Cause:** {{ROOT_CAUSE_DESCRIPTION}}
**Files Affected:**
- `{{FILE_PATH}}:{{LINE_NUMBER}}` - {{ISSUE_DESCRIPTION}}
- `{{FILE_PATH}}:{{LINE_NUMBER}}` - {{ISSUE_DESCRIPTION}}

**Actions:**
- [ ] {{SPECIFIC_ACTION_1}}
- [ ] {{SPECIFIC_ACTION_2}}
- [ ] {{SPECIFIC_ACTION_3}}

**Code Example:**
```{{LANGUAGE}}
{{CODE_EXAMPLE}}
```

### Issue 2: {{GROUPED_ISSUE_TITLE}}
**Root Cause:** {{ROOT_CAUSE_DESCRIPTION}}
**Files Affected:**
- `{{FILE_PATH}}:{{LINE_NUMBER}}` - {{ISSUE_DESCRIPTION}}

**Actions:**
- [ ] {{SPECIFIC_ACTION_1}}
- [ ] {{SPECIFIC_ACTION_2}}

## CodeRabbit Analysis Summary

### Resolved Comments ✅
- {{RESOLVED_COMMENT_1}}
- {{RESOLVED_COMMENT_2}}

### Unresolved Comments 🔴
- {{UNRESOLVED_COMMENT_1}} - {{STATUS}}
- {{UNRESOLVED_COMMENT_2}} - {{STATUS}}

### Comment Categories
- **Critical:** {{COUNT}} comments (React Native compatibility, security, memory leaks)
- **Architecture:** {{COUNT}} comments (API design, type safety)
- **Code Quality:** {{COUNT}} comments (testing, imports, documentation)

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

## Agent Verification Checklist

**BEFORE FINALIZING - VERIFY EACH ITEM:**
- [ ] ✅ Read ALL {{TOTAL_COMMENTS}} CodeRabbit comments thoroughly
- [ ] ✅ Checked each comment for "✅ Addressed" status
- [ ] ✅ Excluded all nitpick/style/documentation-only suggestions
- [ ] ✅ Only included MEDIUM+ severity issues (security, architecture, functionality)
- [ ] ✅ Verified unresolved count is accurate
- [ ] ✅ If 0 unresolved issues, used "All issues resolved" template
- [ ] ✅ Double-checked that each "unresolved" issue is actually unresolved

**SEVERITY VERIFICATION:**
- [ ] ✅ CRITICAL: Security, memory leaks, platform compatibility ({{CRITICAL_COUNT}})
- [ ] ✅ HIGH: API inconsistencies, type safety, architecture ({{HIGH_COUNT}})
- [ ] ✅ MEDIUM: Test coverage, performance, minor architecture ({{MEDIUM_COUNT}})
- [ ] ❌ LOW/NITPICK: Style, naming, docs (EXCLUDED - {{EXCLUDED_COUNT}})

---

**Last Updated:** {{DATE}}
**CodeRabbit Comments Analyzed:** {{TOTAL_COMMENTS}}
**Unresolved Medium+ Issues:** {{UNRESOLVED_COUNT}}
**Excluded Low/Nitpick Issues:** {{EXCLUDED_COUNT}}
