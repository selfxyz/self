# Euclid Web Consolidation Plan (Draft)

## Status

Draft and evolving. This document captures the current direction and will be refined as migration work progresses.

## Goal

Use `euclid-web` as the single source of truth for new SDK flow screens and business flow logic, while KMP/RN/mobile hosts become thin wrappers around a shared WebView flow.

## Target Architecture

1. `euclid-web` owns screen UI and flow orchestration.
2. Host apps (KMP demo, RN demo, mobile app) own only:
   - WebView hosting
   - bridge wiring
   - platform permissions/lifecycle
   - callback handoff to native caller
3. SDK surface remains stable while underlying UI/flow logic converges to web.

## Scope Boundary (Current)

In scope now:
- WebView launch reliability
- Host-to-web bridge contract
- Callback plumbing and smoke verification

Out of scope now:
- Full verification journey implementation parity in all hosts
- Consolidating/removing demo apps
- Reworking non-bridge native UI beyond what is needed for hosting

## Phased Plan

### Phase 0: Stabilize Launch (Current PR)

- Keep changes limited to launch reliability and local dev host setup.
- Ensure `kmp:start` reliably starts the web server and supports emulator/device access.
- Keep debug-only code removed unless required for ongoing validation.

### Phase 1: Shared Host Contract (Next PR)

- Define one shared config contract for URL/env/flags consumed by KMP + RN hosts.
- Define one shared event/callback contract (`success`, `error`, `cancel`, optional progress).
- Add smoke tests in each host for launch -> callback -> close path.

### Phase 2: Incremental Screen Migration

- All new flow screens land in `euclid-web` first.
- Remove duplicate native screens from demo apps as each flow area reaches parity.
- Keep demos as thin bridge/host harnesses during migration.

### Phase 3: Consolidate Demo Surface

- Decide final demo strategy once parity is high:
  - single primary demo + one bridge harness, or
  - both retained with explicit ownership and minimal overlap.
- De-scope duplicated flow logic from host apps.

### Phase 4: Mobile App Convergence

- Mobile app consumes the same `euclid-web` flow path as SDK demos.
- Native app keeps only host/platform concerns and app-specific shell concerns.

## Decision Rules

- If a change is launch/config/bridge related: belongs in host SDK work.
- If a change is flow UI/logic: belongs in `euclid-web`.
- If work duplicates flow code across hosts: treat as temporary and track removal.

## Open Questions

1. What is the long-term canonical demo app for partner validation?
2. What is the minimum bridge API required before flow migration accelerates?
3. Do we need a compatibility matrix per host (KMP/RN/mobile app) for each migrated flow?
4. What release gating is required before removing duplicated native flow screens?

## Proposed Near-Term PR Slices

1. Host contract + callback schema standardization.
2. RN and KMP smoke tests aligned to the same launch/callback assertions.
3. First euclid-web-only flow segment integrated into both hosts.

## Notes

This is intentionally incomplete. Add decisions and open items as migration discoveries are made.
