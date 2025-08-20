# PR Analysis Workflow

## Objective
Ensure consistent identification of only **medium to critical unresolved non-nitpick** comments from CodeRabbit PR reviews.

## Critical Filtering Rules

### 1. Status Verification (MANDATORY)
```
✅ INCLUDE: Comments without "✅ Addressed" status
❌ EXCLUDE: Comments with "✅ Addressed in commits X to Y"
```

### 2. Severity Classification
```
✅ CRITICAL: Security vulnerabilities, memory leaks, breaking platform compatibility
✅ HIGH: API inconsistencies, type safety issues, significant architectural problems
✅ MEDIUM: Test coverage gaps, minor architectural improvements, performance concerns
❌ LOW/NITPICK: Style, naming, documentation, minor suggestions
```

### 3. Comment Type Mapping
```
CodeRabbit Labels → Severity Level:
⚠️ "Potential issue" → HIGH/CRITICAL (include)
🛠️ "Refactor suggestion" → MEDIUM/HIGH (evaluate content)
💡 "Verification agent" → MEDIUM (include if architectural)
_suggestion_ → LOW (exclude unless security/performance)
```

## Step-by-Step Process

### Phase 1: Data Collection
1. Use `giga_read_pr` to fetch PR data and all CodeRabbit comments
2. Count total comments for verification
3. Extract comment metadata: ID, type, status, file paths, line numbers

### Phase 2: Initial Filtering
For each comment:
1. **Check Status**: Skip if contains "✅ Addressed"
2. **Check Type**: Identify comment category (security, architecture, style, etc.)
3. **Check Severity**: Map to CRITICAL/HIGH/MEDIUM/LOW scale
4. **Apply Filters**: Only keep MEDIUM+ severity unresolved comments

### Phase 3: Content Analysis
For remaining comments:
1. **Read Full Content**: Understand the actual issue
2. **Categorize Impact**:
   - Blocks merge? → CRITICAL
   - Affects architecture/API? → HIGH
   - Improves quality? → MEDIUM
   - Cosmetic only? → LOW (exclude)
3. **Group by Root Cause**: Related issues together

### Phase 4: Verification (MANDATORY)
1. **Double-check Status**: Re-verify no "✅ Addressed" comments included
2. **Count Verification**: Ensure unresolved count matches filtered list
3. **Severity Audit**: Confirm each issue is truly MEDIUM+ impact
4. **Template Selection**:
   - If 0 unresolved → Use "All issues resolved" template
   - If >0 unresolved → Use standard template with issues

### Phase 5: Documentation
1. **Create Action Items**: Use updated template with verification checklist
2. **Provide Evidence**: Include comment IDs, file paths, line numbers
3. **Add Code Examples**: Show current issue and proposed fix
4. **Track Metrics**: Total comments, unresolved count, excluded count

## Quality Assurance

### Red Flags (Double-check if you see these)
- High unresolved count (>5) - likely including nitpicks
- All comments marked unresolved - likely missing status checks
- Style/formatting issues in critical section - wrong severity classification
- Vague descriptions - insufficient content analysis

### Green Flags (Good indicators)
- Low unresolved count (0-3) - proper filtering
- Clear severity justification - good analysis
- Specific file paths and line numbers - thorough review
- Code examples for fixes - actionable output

## Common Mistakes to Avoid

### ❌ Don't Include:
- Comments with "✅ Addressed" status
- Style/formatting suggestions
- Documentation improvements (unless critical)
- Naming conventions
- Minor refactoring suggestions
- Import organization
- Code comments/JSDoc additions

### ✅ Do Include:
- Security vulnerabilities
- Memory leaks
- Platform compatibility issues (DOM in React Native)
- API design inconsistencies
- Type safety problems
- Performance bottlenecks
- Test coverage gaps for critical paths
- Breaking changes without migration

## Template Usage

### When All Issues Resolved (Most Common)
```markdown
## Analysis Summary
**After thorough review of all 15 CodeRabbit comments, ALL issues have been resolved in subsequent commits. The PR is ready for merge.**

### Unresolved Comments 🔴 (0/15)
**None** - All comments have been addressed.
```

### When Unresolved Issues Exist (Rare)
```markdown
## Critical Issues (Blocking Merge)

### 1. Security Vulnerability - PII in Logs
**Files:** `src/logger.ts:45`
**CodeRabbit Comment:** 2286479767
**Problem:** Logging sensitive user data without redaction
**Status:** ⚠️ **CRITICAL** - Security risk, blocks merge
```

## Metrics Tracking

Track these metrics for each PR analysis:
- Total CodeRabbit comments analyzed
- Comments with "✅ Addressed" status (excluded)
- Low/nitpick severity comments (excluded)
- Medium+ severity unresolved comments (included)
- Final unresolved count in action items

## Continuous Improvement

### Weekly Review
- Audit recent PR action items for false positives/negatives
- Check if any "resolved" issues were actually unresolved
- Verify severity classifications were accurate
- Update filtering rules based on patterns

### Template Updates
- Add new comment type mappings as CodeRabbit evolves
- Refine severity criteria based on project needs
- Update verification checklist based on common mistakes
- Enhance automation where possible

---

**Remember**: It's better to exclude a borderline issue than include a nitpick. The goal is actionable, high-impact feedback only.
