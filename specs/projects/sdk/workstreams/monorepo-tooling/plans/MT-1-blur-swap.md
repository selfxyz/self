## Swap `react-native-blur-effect` to `@react-native-community/blur`

> Last updated: 2026-05-20
> Status: Draft

- Workstream: monorepo-tooling
- Backlog IDs: MT-1, MT-2
- Owner: TBD
- Branch: TBD
- PR: TBD

### Why

`react-native-blur-effect` causes pnpm to install a nested duplicate
`react-native`, which forced temporary peer-resolution workarounds during the
pnpm conversion. The public `BlurView` API belongs to `@selfxyz/euclid`, so the
implementation swap should happen upstream first and this repo should only bump
consumers and remove temporary local cleanup.

### Dependencies

- A published `@selfxyz/euclid` version that replaces
  `react-native-blur-effect` with `@react-native-community/blur`.
- If no Euclid release exists within two weeks of MT-1 kickoff, use the local
  wrapper fallback described in `SPEC.md` and create a follow-up to revert it
  after the Euclid release.

### Scope

- Bump Euclid consumers in this repo to the version containing the blur swap.
- Remove every `react-native-blur-effect` declaration. It is currently present
  in all of the following — each must be removed for the nested RN duplicate to
  go away:
  - `app/package.json` — the `dependencies` entry **and** the
    `react-native-blur-effect` line in the root-level `overrides` block.
  - `packages/mobile-sdk-alpha/package.json` — the `peerDependencies` entry
    **and** the matching `peerDependenciesMeta` optional block.
  - `packages/mobile-sdk-demo/package.json` — the dependency entry.
  - root `package.json` — the `resolutions` pin.
  - `pnpm-workspace.yaml` — the `overrides` pin **and** the
    `@selfxyz/euclid` peer-optional workaround block.
- Remove `app/tests/__setup__/blurEffectMock.js`.
- Remove the related `moduleNameMapper` entry from `app/jest.config.cjs`.

### Out of Scope

- Rewriting Euclid source inside this repository.
- Adding Expo dependencies.
- Changing app call sites that already consume Euclid's `BlurView` API.

### Validation

```bash
pnpm install --frozen-lockfile
pnpm --filter @selfxyz/mobile-app test
pnpm why react-native-blur-effect
```

Additional checks:

- `pnpm why react-native-blur-effect` reports no dependency path.
- `find node_modules -mindepth 2 -name react-native -type d` does not show a
  nested copy under `react-native-blur-effect`.
- Visual smoke confirms blur renders on the tab bar, recovery phrase reveal,
  and document scan viewfinder.
- `mobile-sdk-demo` still builds for iOS and Android without Expo autolinking.

### Definition of Done

- [ ] Consumers use the Euclid version with the blur swap.
- [ ] Local blur-effect dependency, resolution, peer workaround, and Jest mock
      are removed.
- [ ] Mobile app Jest tests pass.
- [ ] Manual or CI native smoke evidence is recorded in the PR.
