## Summary

<!-- Brief description of changes -->

## Test plan

<!-- How was this tested? -->

---

### Native Consolidation Checklist

<!-- Check items that apply to this PR. Delete section if not touching native code. -->

- [ ] CONTRACTS.md reviewed - no unintended contract changes
- [ ] Layer 1 bridge contract tests pass (`cd app && pnpm jest:run` / `pnpm --filter @selfxyz/rn-sdk-test-app test`)
- [ ] Layer 3 builds pass (app iOS, RN test app iOS, RN test app Android)
- [ ] Layer 4 manual smoke test signed off (if consolidation PR)
- [ ] No new native business logic added (logic belongs in TypeScript)
