# Publishing Readiness for AAR and XCFramework

> Last updated: 2026-03-10
> Status: Ready

- Workstream: native-shells
- Backlog IDs: NS-03
- Owner: Native Shells
- Branch: TBD
- PR: TBD

## Why

- `Production publishing (npm + AAR + XCFramework)` is still open at the SDK level.
- Packaging gaps are easy to lose track of because implementation and release concerns are split across multiple specs.
- This plan isolates artifact-readiness work from feature work.

## Scope

- Audit current AAR and XCFramework generation paths.
- Define missing packaging metadata, versioning, release inputs, and validation steps.
- Update the relevant specs so release readiness is tracked in one place.

## Out of Scope

- Performing the actual release/publish step.
- RN npm publishing.
- Feature changes to handlers or bridge contracts.

## Files to Modify

- `specs/projects/sdk/workstreams/native-shells/SPEC.md`
- `specs/projects/sdk/OVERVIEW.md`
- packaging/handoff docs if needed

## Files Not to Modify

- runtime handler implementations unless packaging audit exposes a required packaging-only change

## Preconditions

- Physical-device validation should be complete or explicitly waived.
- Versioning/release ownership is identified.

## Implementation Notes

- Keep this focused on release readiness, not implementation cleanup.
- If packaging requires code changes, split those into child backlog IDs or follow-up plans.

## Validation

```bash
cd packages/kmp-sdk && ./gradlew :shared:assembleDebug
cd packages/kmp-sdk && ./gradlew :shared:linkDebugFrameworkIosSimulatorArm64
cd packages/self-sdk-swift && swift build
```

## Definition of Done

- [ ] AAR generation path documented and validated
- [ ] XCFramework or framework packaging path documented and validated
- [ ] Remaining blockers explicitly listed
- [ ] Backlog row updated

## Status Log

- 2026-03-10: Created from SDK publishing follow-up.
