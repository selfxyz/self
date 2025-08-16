# PR {{PR_NUMBER}} - Action Items Template

## PR Overview
**Title:** {{PR_TITLE}}
**Author:** {{AUTHOR}}
**Status:** {{STATUS}}
**Created:** {{DATE}}
**Branch:** {{BRANCH}}

## Summary
{{PR_SUMMARY}}

## Key Changes
- {{CHANGE_1}}
- {{CHANGE_2}}
- {{CHANGE_3}}

## Action Items

### 🔧 Critical Issues (High Priority)
*Security vulnerabilities, breaking changes, critical bugs*

#### 1. {{CRITICAL_ISSUE_TITLE}}
**Status:** 🔴 Critical Issues Identified
**Files:** {{FILE_PATHS}}

**Issues:**
- [ ] **Security Risk:** {{SECURITY_DESCRIPTION}}
- [ ] **Cache Key Problems:** {{CACHE_DESCRIPTION}}
- [ ] **Missing Validation:** {{VALIDATION_DESCRIPTION}}

**Required Actions:**
```bash
# Specific code examples for fixes
{{CODE_EXAMPLE}}
```

### 📦 Functional Issues (Medium Priority)
*Bugs, missing features, incorrect behavior*

#### 2. {{FUNCTIONAL_ISSUE_TITLE}}
**Status:** 🟡 Missing Dependencies
**Files:** {{FILE_PATHS}}

**Issue:** {{ISSUE_DESCRIPTION}}

**Actions:**
- [ ] {{ACTION_1}}
- [ ] {{ACTION_2}}
- [ ] {{ACTION_3}}

### 🧪 Testing & Validation (High Priority)

#### 3. Fix Failing Tests
**Status:** 🔴 Blocking Issues
**Files:** {{TEST_FILES}}

**Known Failures:**
- [ ] **{{TEST_TYPE}}:** {{FAILURE_DESCRIPTION}}

**Actions:**
- [ ] Investigate {{ISSUE_TYPE}} configuration issues
- [ ] Check {{COMPATIBILITY}} compatibility
- [ ] Update test configurations if needed

#### 4. Comprehensive Test Suite
**Status:** 🟡 Verification Required

**Actions:**
- [ ] Run `yarn workspace @selfxyz/{{WORKSPACE_1}} test`
- [ ] Run `yarn workspace @selfxyz/{{WORKSPACE_2}} test`
- [ ] Run `yarn types`
- [ ] Run `yarn build`

### 🔍 Code Review Tasks

#### 5. Review Changes
**Status:** 🟡 Review Required

**Actions:**
- [ ] Review all {{CHANGE_TYPE}} changes for security implications
- [ ] Verify {{CONSISTENCY}} is consistent across all {{SCOPE}}
- [ ] Check that {{CONFIGURATION}} is properly updated
- [ ] Ensure {{ACTIONS}} are properly configured

### 🚀 Deployment Considerations

#### 6. Pre-deployment Checklist
**Status:** 🟡 Planning Required

**Actions:**
- [ ] Test CI/CD pipeline with new {{FEATURE}} handling
- [ ] Verify all workflows pass with {{CHANGES}} changes
- [ ] Test {{RESOLUTION}} resolution in all environments
- [ ] Validate build artifacts are consistent

## Risk Assessment

### High Risk
- **{{RISK_1}}:** {{RISK_1_DESCRIPTION}}
- **{{RISK_2}}:** {{RISK_2_DESCRIPTION}}
- **{{RISK_3}}:** {{RISK_3_DESCRIPTION}}

### Medium Risk
- **{{RISK_4}}:** {{RISK_4_DESCRIPTION}}
- **{{RISK_5}}:** {{RISK_5_DESCRIPTION}}

### Low Risk
- **{{RISK_6}}:** {{RISK_6_DESCRIPTION}}
- **{{RISK_7}}:** {{RISK_7_DESCRIPTION}}

## Success Criteria

- [ ] All CI workflows pass consistently
- [ ] No security vulnerabilities in {{FILES}}
- [ ] All tests pass across all workspaces
- [ ] {{DEPENDENCIES}} versions are properly aligned
- [ ] {{FEATURE}} handling is robust and secure
- [ ] {{CACHE}} keys prevent {{MISMATCH}} mismatches

## Notes

- **{{ANALYSIS_TOOL}} Analysis:** {{ANALYSIS_SUMMARY}}
- **Testing Status:** {{TESTING_STATUS}}
- **Security Concerns:** {{SECURITY_CONCERNS}}
- **Dependencies:** {{DEPENDENCY_ISSUES}}

## Timeline Estimate

- **Critical Fixes:** {{TIMELINE_1}}
- **Testing & Validation:** {{TIMELINE_2}}
- **Code Review:** {{TIMELINE_3}}
- **Deployment:** {{TIMELINE_4}}

**Total Estimated Time:** {{TOTAL_TIMELINE}}

---

**Last Updated:** {{DATE}}
