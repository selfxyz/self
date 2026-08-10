# KR-04 — Scope KMP's role in the Self app host

> Workstream: [KMP Revival](../SPEC.md)
> Status: Ready
> Priority: Medium
> Scope: Documentation only

## Why

The active KMP spec describes `packages/kmp-sdk` only as an option for
external consumers that already use Kotlin Multiplatform. The project
decision log and WebView-in-App plans also place KMP underneath the Self
app's RN WebView host. Those descriptions cannot remain ambiguous because
they imply different priorities, dependencies, and completion gates.

## Decision

Treat the WebView-in-App architecture and its Path A migration plans as
the source of truth: KMP is the canonical native bridge implementation
used through `rn-sdk` by the Self app, while remaining directly consumable
by external KMP applications. This scope pass documents that role; it does
not add bridge domains or implementation work.

## Files modified

- `specs/projects/sdk/workstreams/kmp-revival/SPEC.md` — update Purpose,
  the KMP/native-shell comparison, dependencies, and completion language.
- `specs/projects/sdk/DECISIONS.md` — remove the mismatch note after the
  active spec agrees with the recorded direction.
- `specs/projects/sdk/workstreams/webview-in-app/SPEC.html` or its active
  Path A plan — update only if the reciprocal dependency is missing.

## Acceptance criteria

- KMP's first-party Self app role and external-consumer role are both
  explicit.
- The 3-domain KR-01–KR-03 scope is not silently widened; later domain
  migration remains owned by WebView-in-App.
- KMP Revival and WebView-in-App link to each other with consistent
  dependency direction.
- No source, build, package, or protocol files change.

## Validation

- Run Prettier on the changed docs.
- Verify every changed relative link resolves.
