## Summary

<!-- Brief description of changes -->

## Test plan

<!-- How was this tested? -->

---

### Native code checklist

<!-- Only if this PR touches Kotlin/Swift or the React Native module bridge. Delete this section otherwise. -->

Run each command and check the box only after it passes. Paste failures into the Test plan.

- [ ] `yarn lint && yarn types` pass
- [ ] Bridge contract tests pass: `cd app && yarn jest:run` and `yarn workspace @selfxyz/rn-sdk-test-app test`
- [ ] If `packages/mobile-sdk-alpha` touched: `cd packages/mobile-sdk-alpha && yarn test && yarn types` pass
- [ ] Diff of `.kt`/`.swift` reviewed — no business logic added (only hardware/OS access; logic lives in TypeScript)
- [ ] NativeModules bridge contract (method names, payload keys, error codes) unchanged, or the change is intentional and described in the summary

**Cannot be verified by an agent — flag for human QA:**

- [ ] Native builds (app + RN test app, iOS + Android) — relying on CI, or needs a human local build
- [ ] On-device smoke test of the affected flow (e.g. NFC passport read, MRZ camera scan) — **needs human**, or N/A if no runtime behavior changed
