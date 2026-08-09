## Audit nested duplicates and dedupe lockfile

> Last updated: 2026-08-09
> Status: Open - lowest priority in the workstream, but now carries the
> post-RN-upgrade override cleanup with a concrete finding list

- Workstream: monorepo-tooling
- Backlog IDs: MT-14, MT-18
- Owner: TBD
- Branch: TBD
- PR: TBD

### Why

`react-native-blur-effect` exposed one nested React Native duplicate, but there
may be more duplicate transitive versions left by the migration. This plan
separates dependency graph cleanup from strictness and linker changes so the
lockfile diff stays reviewable.

### Dependencies

- MT-1 should land first so blur-effect duplicates are gone before the audit.
- MT-6 should land first if overrides or patch migration would otherwise create
  lockfile churn.

### Scope

- Inventory nested `node_modules/*/node_modules/*` duplicates.
- Identify RN-adjacent duplicates and stale peer ranges.
- Run `pnpm dedupe` and audit the lockfile diff.
- Add or remove overrides only when the version choice is low-risk and
  justified.
- Keep intentional duplicate versions documented when packages require
  incompatible ranges.

### Override findings (verified 2026-08-09)

Inherited from the RN 0.83 / Expo 55 upgrade close-out (SELF-3786), which
asked which `pnpm-workspace.yaml` overrides can drop now that the upgrade
has settled. Findings below are verified against the manifests and
`pnpm-lock.yaml`, not inferred. Work each one to a decision; "keep" is a
valid outcome as long as the rationale is recorded.

**Already resolved — do not re-litigate.** `react-native-webview` no
longer has a dep/override mismatch. Every workspace declares `13.16.0`
and the override is `13.16.0`. The earlier `13.16.1` app dep is gone.

1. **`jsdom` — the one live mismatch, and MT-27's condition is now met.**
   `packages/webview-app/package.json` declares `^29.0.1`; the override
   forces `^25.0.1` and the lockfile resolves all three consumers to
   `25.0.1`. MT-27's own removal condition is "must stay until the
   workspace lands on react-dom v19" — the `react-dom` override is
   `^19.2.0` and no workspace pins 18, so that condition is satisfied.
   Prefer dropping the pin and letting webview-app have jsdom 29; if
   something still breaks under 26+, keep the pin and lower webview-app's
   declared range to `^25.0.1` so the manifest stops lying. Either way
   update MT-27 in `../SPEC.md`. (A stray `jsdom@29.0.1` under
   `packages/webview-app/node_modules` is a pre-`pnpm install` leftover,
   not a live resolution — ignore it.)
2. **`prettier` — exact pin below a declared floor.** Override is `3.8.3`;
   root `package.json` declares `^3.9.5`; resolved is `3.8.3`. Given the
   format-drift history behind this pin, the override and root's range
   must agree. Bump the override to the version root wants, or lower
   root's range. Do not leave them disagreeing. `typechain>prettier:
2.8.8` is a separate, deliberate nested pin — keep it.
3. **Stale override floors.** `@babel/core ^7.28.6` vs app `^7.29.0`
   (resolves 7.29.0) and `@babel/runtime ^7.28.6` vs root `^7.29.7`
   (resolves 7.29.2). The carets absorb these so resolution is correct
   today, but the overrides no longer enforce the floors the manifests
   ask for. Raise them to match or note that they are intentionally
   loose dedupe pins with no floor semantics.
4. **Redundant pins carried over from the Yarn `resolutions` inventory.**
   `punycode: npm:punycode.js@^2.3.1` and `react-native-passkey: ^3.3.3`
   mirror what the deps already accept. `react-native-blur-effect: 1.1.3`
   is load-bearing for a different reason — see the MT-1/MT-2 note in
   `../SPEC.md` before touching it, because dropping it can reintroduce a
   nested `react-native`.
5. **Not yet audited for whether they are still needed.**
   `@swc/core 1.7.36`, `@tamagui/animations-react-native 1.144.4`,
   `@tamagui/toast 1.144.4`, `@noble/hashes 1.8.0`,
   `@noble/curves 1.9.7`, `ethereum-cryptography 3.2.0`,
   `@types/node ^22.20.1`. Each needs a keep/drop call with a reason.

**Must survive.** `@types/minimatch: 5.1.2` (MT-28) — v6 is a typeless
stub and `sdk/qrcode-angular` still builds with `ng-packagr@^20.3.0`, so
the `TS2688` failure mode is live. `circom_tester` stays until MT-22
lands; note that `circuits` declares `github:...#main` while the override
pins sha `81e963ce`, so the override is what makes the API stable.

### Out of Scope

- Major dependency upgrades.
- Isolated linker migration.
- Fixing peer strictness failures unless they are direct duplicate causes.

### Validation

```bash
find node_modules -mindepth 2 -name node_modules -type d
pnpm dedupe --check
pnpm --filter @selfxyz/mobile-app test
pnpm types
```

Additional checks:

- Lockfile diff is reviewed package-by-package, not accepted blindly.
- Any retained duplicate with user-facing risk is documented in the PR.

### Files Modified

| File                                 | Change                                    |
| ------------------------------------ | ----------------------------------------- |
| `pnpm-lock.yaml`                     | Dedupe result.                            |
| `package.json` / workspace manifests | Add narrow overrides only when justified. |

### Definition of Done

- [ ] Nested duplicates are inventoried.
- [ ] `pnpm dedupe --check` exits clean after the change.
- [ ] Retained duplicates are intentional and documented.
- [ ] Mobile app tests and repo typecheck pass.
- [ ] Every numbered override finding above has a recorded keep/drop
      decision with a reason. No override is left disagreeing with a
      declared dependency range in either direction.
- [ ] MT-27 in `../SPEC.md` reflects the `jsdom` outcome.
