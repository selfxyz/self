## Harden pnpm-native install configuration

> Last updated: 2026-05-20
> Status: Draft

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

- Move root `package.json` `resolutions` pins to `pnpm.overrides`.
- Replace root `postinstall` `patch-package` behavior with
  `pnpm.patchedDependencies`.
- Remove `patch-package` when no longer needed.
- Audit `pnpm.onlyBuiltDependencies` / `allowBuilds` entries and keep only
  packages whose install scripts are required.
- Add one-line justification comments for every retained install-script
  allowlist entry, using the config format supported by pnpm.
- Bump the root `packageManager` pnpm pin from `11.1.1` to the chosen current
  minor after confirming Corepack in CI resolves it without warning.

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

- The lockfile maps every former `resolutions` pin through `pnpm.overrides`.
- Root `package.json` no longer runs `patch-package` from `postinstall`.
- Every retained install-script allowlist entry has a justification.
- CI logs show Corepack resolves the pinned pnpm version without warning.

### Files Modified

| File                             | Change                                                                             |
| -------------------------------- | ---------------------------------------------------------------------------------- |
| `package.json`                   | Move pins to `pnpm.overrides`, remove patch-package hook, bump pnpm pin.           |
| `pnpm-lock.yaml`                 | Reflect override, patch, and pnpm-version changes.                                 |
| `pnpm-workspace.yaml` / `.npmrc` | Keep install-script allowlist comments where the active pnpm config supports them. |
| `patches/*`                      | Move or regenerate patches through pnpm native patching.                           |

### Definition of Done

- [ ] Yarn `resolutions` no longer carry active install behavior.
- [ ] Patches apply through pnpm native patching.
- [ ] Install-script allowlist is trimmed and justified.
- [ ] Updated pnpm pin works in CI.
- [ ] Mobile app tests and repo typecheck pass.
