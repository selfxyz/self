## Harden pnpm-native install configuration

> Last updated: 2026-05-20
> Status: Archived 2026-08-06 - complete

- Workstream: monorepo-tooling
- Backlog IDs: MT-6, MT-7, MT-10, MT-16, MT-17
- Owner: TBD
- Branch: TBD
- PR: TBD

### Why

The pnpm conversion still carries Yarn-era resolution and patching patterns.
This plan turns them into pnpm-native install configuration in one PR because
the acceptance criteria all depend on a clean `pnpm install` and lockfile diff.

### Scope

- Move root `package.json` `resolutions` pins to the `overrides` block in
  `pnpm-workspace.yaml` (the established location — `circom_tester`, `jsdom`,
  and `@types/minimatch` already live there). Do not create a second
  `pnpm.overrides` block in `package.json`.
- Add a `pnpm-workspace.yaml` `overrides` entry `node-pre-gyp-github: 1.4.4`
  so the `@zk-email/relayer-utils` transitive resolves from the npm registry
  instead
  of the `ultamatt/node-pre-gyp-github` git tarball. Verify by running
  `relayer-utils`'s postinstall against the registry version locally before
  landing. This removes one of two blockers MT-9 currently waits on; the
  other (`circom_tester`) is owned by MT-21/MT-22.
- Replace root `postinstall` `patch-package` behavior with
  `pnpm.patchedDependencies`.
- Remove `patch-package` when no longer needed.
- If the patch conversion is noisy, keep the remaining patch-package
  migration as a small MT-6 follow-up rather than leaving the postinstall hook
  in place.
- Audit `pnpm.onlyBuiltDependencies` / `allowBuilds` entries and keep only
  packages whose install scripts are required.
- Add one-line justification comments for every retained install-script
  allowlist entry, using the config format supported by pnpm.
- Bump the root `packageManager` pnpm pin from `11.5.3` to `11.7.0`, after
  confirming Corepack in CI resolves it without warning. Update
  `scripts/check-pnpm-version.mjs` (and any other pin references) to match.

### Out of Scope

- Enabling `strictPeerDependencies` or `blockExoticSubdeps`; MT-9 owns those.
- Switching away from `nodeLinker: hoisted`; MT-12 owns that.
- General lockfile dedupe unrelated to moved overrides or patches; MT-14 owns
  that pass.

### Validation

```bash
pnpm install --frozen-lockfile
pnpm why <each-overridden-package>
pnpm --filter @selfxyz/mobile-app test
pnpm types
```

Additional checks:

- The lockfile maps every former `resolutions` pin through the
  `pnpm-workspace.yaml` `overrides` block.
- Root `package.json` no longer runs `patch-package` from `postinstall`.
- Every retained install-script allowlist entry has a justification.
- CI logs show Corepack resolves the pinned pnpm version without warning.

### Files Modified

| File                             | Change                                                                                                                                   |
| -------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `package.json`                   | Remove `resolutions` pins (moved to `pnpm-workspace.yaml`) and the patch-package `postinstall` hook; bump the `packageManager` pnpm pin. |
| `scripts/check-pnpm-version.mjs` | Update the enforced pin to match the new pnpm version.                                                                                   |
| `pnpm-workspace.yaml`            | Add moved pins + `node-pre-gyp-github` to the `overrides` block; keep justified install-script allowlist comments.                       |
| `pnpm-lock.yaml`                 | Reflect override and patch changes.                                                                                                      |
| `.npmrc`                         | Keep install-script allowlist comments where the active pnpm config supports them.                                                       |
| `patches/*`                      | Move or regenerate patches through pnpm native patching.                                                                                 |

### Definition of Done

- [ ] Yarn `resolutions` no longer carry active install behavior; moved pins
      live in the `pnpm-workspace.yaml` `overrides` block.
- [ ] Patches apply through pnpm native patching.
- [ ] Install-script allowlist is trimmed and justified.
- [ ] pnpm pin bumped from `11.5.3` to `11.7.0`; Corepack resolves it without
      warning in CI and `check-pnpm-version.mjs` matches.
- [ ] Mobile app tests and repo typecheck pass.
- [ ] `pnpm why node-pre-gyp-github` reports a single registry resolution; the
      `codeload.github.com/ultamatt/...` tarball entry is absent from the lockfile.
