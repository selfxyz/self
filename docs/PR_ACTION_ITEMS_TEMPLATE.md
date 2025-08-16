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

#### 2. {{SECOND_CRITICAL_ISSUE}}
**Status:** 🟡 Investigation Required
**Files:** {{FILE_PATHS}}

**Issue:** {{ISSUE_DESCRIPTION}}

**Actions:**
- [ ] {{ACTION_1}}
- [ ] {{ACTION_2}}
- [ ] {{ACTION_3}}

### 📦 Functional Issues (Medium Priority)
*Bugs, missing features, incorrect behavior*

#### 3. {{FUNCTIONAL_ISSUE_TITLE}}
**Status:** 🟡 Missing Dependencies
**Files:** {{FILE_PATHS}}

**Issue:** {{ISSUE_DESCRIPTION}}

**Actions:**
- [ ] {{ACTION_1}}
- [ ] {{ACTION_2}}
- [ ] {{ACTION_3}}

#### 4. {{WORKFLOW_ISSUE_TITLE}}
**Status:** 🟡 Workflow Optimization
**Files:** {{WORKFLOW_FILES}}

**Issue:** {{WORKFLOW_DESCRIPTION}}

**Actions:**
- [ ] {{WORKFLOW_ACTION_1}}
- [ ] {{WORKFLOW_ACTION_2}}
- [ ] {{WORKFLOW_ACTION_3}}

### 🧪 Testing & Validation (High Priority)

#### 5. Fix Failing Tests
**Status:** 🔴 Blocking Issues
**Files:** {{TEST_FILES}}

**Known Failures:**
- [ ] **{{TEST_TYPE}}:** {{FAILURE_DESCRIPTION}}
- [ ] **{{TEST_TYPE_2}}:** {{FAILURE_DESCRIPTION_2}}

**Actions:**
- [ ] Investigate {{ISSUE_TYPE}} configuration issues
- [ ] Check {{COMPATIBILITY}} compatibility
- [ ] Update test configurations if needed
- [ ] Verify test environment setup

#### 6. Comprehensive Test Suite
**Status:** 🟡 Verification Required

**Actions:**
- [ ] Run `yarn workspace @selfxyz/{{WORKSPACE_1}} test`
- [ ] Run `yarn workspace @selfxyz/{{WORKSPACE_2}} test`
- [ ] Run `yarn workspace @selfxyz/{{WORKSPACE_3}} test`
- [ ] Run `yarn types`
- [ ] Run `yarn build`
- [ ] Run `yarn lint`
- [ ] Run `yarn workspace @selfxyz/{{WORKSPACE_4}} build`

### 🔍 Code Review Tasks

#### 7. Review Security Changes
**Status:** 🟡 Review Required

**Actions:**
- [ ] Review all {{CHANGE_TYPE}} changes for security implications
- [ ] Verify {{CONSISTENCY}} is consistent across all {{SCOPE}}
- [ ] Check that {{CONFIGURATION}} is properly updated
- [ ] Ensure {{ACTIONS}} are properly configured
- [ ] Verify sanitization prevents injection attacks
- [ ] Confirm all workflows use consistent patterns

#### 8. Review Workflow Changes
**Status:** 🟡 Review Required

**Actions:**
- [ ] Review {{WORKFLOW_TYPE}} workflow changes
- [ ] Verify {{WORKFLOW_STEP}} is appropriately implemented
- [ ] Check that {{WORKFLOW_PROCESS}} is properly streamlined
- [ ] Ensure no functionality was lost in optimizations

### 🚀 Deployment Considerations

#### 9. Pre-deployment Checklist
**Status:** 🟡 Planning Required

**Actions:**
- [ ] Test CI/CD pipeline with new {{FEATURE}} handling
- [ ] Verify all workflows pass with {{CHANGES}} changes
- [ ] Test {{RESOLUTION}} resolution in all environments
- [ ] Validate build artifacts are consistent
- [ ] Test {{SPECIFIC_FEATURE}} functionality
- [ ] Verify {{WORKFLOW_TYPE}} workflows work correctly

## Risk Assessment

### High Risk
- **{{RISK_1}}:** {{RISK_1_DESCRIPTION}}
- **{{RISK_2}}:** {{RISK_2_DESCRIPTION}}
- **{{RISK_3}}:** {{RISK_3_DESCRIPTION}}

### Medium Risk
- **{{RISK_4}}:** {{RISK_4_DESCRIPTION}}
- **{{RISK_5}}:** {{RISK_5_DESCRIPTION}}
- **{{RISK_6}}:** {{RISK_6_DESCRIPTION}}

### Low Risk
- **{{RISK_7}}:** {{RISK_7_DESCRIPTION}}
- **{{RISK_8}}:** {{RISK_8_DESCRIPTION}}

## Success Criteria

- [ ] All CI workflows pass consistently
- [ ] No security vulnerabilities in {{FILES}}
- [ ] All tests pass across all workspaces
- [ ] {{DEPENDENCIES}} versions are properly aligned
- [ ] {{FEATURE}} handling is robust and secure
- [ ] {{CACHE}} keys prevent {{MISMATCH}} mismatches
- [ ] {{WORKFLOW_TYPE}} workflows are optimized and functional
- [ ] {{SPECIFIC_FEATURE}} works correctly in all environments

## Additional Considerations

### Edge Cases & Future Improvements

#### 10. Monitoring & Alerting
**Status:** 🟡 Future Enhancement

**Considerations:**
- [ ] Monitor for {{MONITORING_ITEM_1}}
- [ ] Set up alerts for {{ALERT_TYPE}} failures
- [ ] Track {{METRIC}} to ensure {{FEATURE}} is working
- [ ] Monitor for any security issues with {{SECURITY_FEATURE}}

#### 11. Documentation Updates
**Status:** 🟡 Future Enhancement

**Actions:**
- [ ] Update {{DOC_TYPE}} documentation to reflect new {{FEATURE}}
- [ ] Document the {{PROCESS}} process
- [ ] Update developer onboarding for {{REQUIREMENT}}
- [ ] Document {{STRATEGY}} strategy for future additions

#### 12. Rollback Plan
**Status:** 🟡 Planning Required

**Actions:**
- [ ] Document rollback procedure if {{CHANGE}} causes issues
- [ ] Identify which {{COMPONENTS}} can be quickly reverted
- [ ] Plan for emergency fixes if {{VALIDATION}} causes failures
- [ ] Prepare fallback strategy for critical deployments

## Notes

- **{{ANALYSIS_TOOL}} Analysis:** {{ANALYSIS_SUMMARY}}
- **Testing Status:** {{TESTING_STATUS}}
- **Security Concerns:** {{SECURITY_CONCERNS}}
- **Dependencies:** {{DEPENDENCY_ISSUES}}
- **Workflow Improvements:** {{WORKFLOW_IMPROVEMENTS}}
- **Cache Optimization:** {{CACHE_OPTIMIZATION}}
- **Comprehensive Coverage:** {{COVERAGE_SUMMARY}}

## Timeline Estimate

- **Critical Fixes:** {{TIMELINE_1}}
- **Testing & Validation:** {{TIMELINE_2}}
- **Code Review:** {{TIMELINE_3}}
- **Deployment:** {{TIMELINE_4}}

**Total Estimated Time:** {{TOTAL_TIMELINE}}

---

**Last Updated:** {{DATE}}
