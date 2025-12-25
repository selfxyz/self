# Mobile SDK docstring style guide

All exported APIs from `packages/mobile-sdk-alpha/src` must carry TSDoc-compliant comments so integrators can rely on generated documentation and in-editor hints.

## Authoring guidelines

- Start each docstring with a one-line summary that describes the intent of the API in the imperative mood.
- Describe complex parameter shapes with `@param` tags and consider linking to shared types with `{@link ...}` when the name alone is ambiguous.
- Capture platform nuances (for example, “Android only”) and error semantics in the main description or an `@remarks` block.
- Prefer examples that demonstrate the supported developer experience (React Native, Expo, etc.) and keep them short enough to scan quickly.

## Coverage expectations

`yarn docstrings:sdk` (or `yarn docstrings` for both app and SDK) surfaces the current coverage numbers in `docs/coverage/*.json`. The CI workflow uploads those JSON files as artifacts so teams can track progress, but the thresholds are advisory for now—missing docstrings will not fail the build. Use the reports to plan follow-up work even when you need to land code without full documentation.
