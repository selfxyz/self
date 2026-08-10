# pnpm migration status

> Authoritative. Re-verified 2026-08-06.
>
> The yarn→pnpm cutover is **complete**. This doc answers "is the migration
> done"; remaining hardening work lives in
> [monorepo-tooling/SPEC.md](../specs/projects/sdk/workstreams/monorepo-tooling/SPEC.md).
> "Migration complete" does not mean "workstream closed."

## Current state

The repo is pnpm-only. Landed in PR #2069.

- All workspace `package.json` scripts call `pnpm`; no `yarn` invocations remain.
- `packageManager` is pinned at the root and enforced by
  `scripts/check-pnpm-version.mjs` locally and in CI. Read the version from root
  `package.json` rather than trusting a copy here — it has been bumped several
  times since the cutover (`11.1.1` → `11.5.3` → `11.7.0` → `11.12.0`).
- CI uses `./.github/actions/pnpm-install` and `./.github/actions/cache-pnpm`.
  The yarn-only composites (`cache-yarn`, `yarn-install`, `yarnrc-hash`) are gone.
- App build scripts (`app/scripts/mobile-ci-build-android.sh`,
  `app/ios/scripts/install-ios-deps-if-needed.sh`) use `pnpm-lock.yaml` and
  `pnpm pack` / `pnpm add file:…` flows.
- `.yarnrc.yml` `packageExtensions` for `@selfxyz/euclid` moved to
  `packageExtensions` in `pnpm-workspace.yaml`.
- `yarn.lock` and `.yarnrc.yml` are removed.

Migration goals were met: dependency consolidation (yarn `resolutions` absorbed
into `pnpm.overrides`), faster CI (Turbo task graph plus `cache-turbo`, and
`node_modules` dropped from the build caches), and supply-chain hardening
(`minimumReleaseAge` quarantine plus a default-deny `allowBuilds` install-script
allowlist with per-entry rationale).

pnpm 11 reads workspace settings from `pnpm-workspace.yaml` and **ignores** the
`pnpm` field in root `package.json`. Settings put in the wrong file fail
silently.

## Residual yarn references (intentional)

None are on the install or build path. Verified still accurate 2026-08-06:

- `.gitignore` / `.prettierignore` / `.cursorignore` entries matching
  `yarn.lock` or `.yarnrc.yml` — kept so a stray regeneration stays ignored.
- `app/README.md`, `app/docs/MOBILE_DEPLOYMENT.md` — narrative docs still
  showing `yarn` commands; pending a docs pass.
- `circuits/package.json` declares `@yarnpkg/sdks` as a dev dependency for
  editor SDKs. Harmless under pnpm.
- `packages/mobile-sdk-demo` depends on the third-party package
  `find-yarn-workspace-root`. That is a package name; it does not require Yarn.

## Gotchas

Each of these cost real debugging time. Check here before deep-diving an
install, format, or Metro failure.

**`pnpm format` fails on a Yarn `portal:` dependency.** pnpm does not support the
`portal:` protocol — use `link:`.

**`pnpm format` throws prettier `EACCES` on a `/Volumes`-hosted checkout.** The
volume drops the exec bit on copied binaries, so the prettier bin is not
executable. Not a prettier or config bug.

**Stale yarn-era `node_modules` inside a workspace shadow the root versions.**
Leftovers from before the cutover (e.g. under `contracts/`) take resolution
priority. `pnpm install` will not clean them — delete the directories manually.

**`.watchmanconfig` must NOT ignore `node_modules` or `dist`.** Metro resolution
breaks if it does. A guard test enforces this (PR #2178). If a lint or perf
suggestion points at adding those ignores, the guard is right and the suggestion
is wrong.

## Verification

From a clean clone:

```bash
nvm use && corepack enable && pnpm install
pnpm lint && pnpm types && pnpm build
```
