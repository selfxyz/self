# pnpm migration status

## Current state (as of 2026-05-12)

**Migration complete.** The repo is pnpm-only.

What changed in the cutover:

- All workspace `package.json` scripts call `pnpm` (no `yarn` invocations remain).
- All `packageManager` fields point at `pnpm@11.1.1`.
- CI workflows use `./.github/actions/cache-pnpm` and `./.github/actions/pnpm-install`. The yarn-only composite actions (`cache-yarn`, `yarn-install`, `yarnrc-hash`) have been removed.
- App build scripts (`app/scripts/mobile-ci-build-android.sh`, `app/ios/scripts/install-ios-deps-if-needed.sh`) use `pnpm-lock.yaml` and `pnpm pack` / `pnpm add file:…` flows.
- `.yarnrc.yml` packageExtensions for `@selfxyz/euclid` have been migrated to `packageExtensions` in `pnpm-workspace.yaml`.
- `yarn.lock` and `.yarnrc.yml` are removed.

## Residual yarn references (intentional)

These are not blockers and live outside the install/build path:

- `.gitignore` / `.prettierignore` / `.cursorignore` entries that match `yarn.lock` or `.yarnrc.yml` — kept so any stray regeneration is ignored.
- `app/README.md`, `app/docs/MOBILE_DEPLOYMENT.md` — narrative docs that mention `yarn.lock`; will be refreshed in a docs pass.
- `circuits/package.json` declares `@yarnpkg/sdks` as a dev dependency for editor SDKs; harmless under pnpm and removed in a follow-up if unused.
- `packages/mobile-sdk-demo` depends on the third-party package `find-yarn-workspace-root`. That is a package name; it does not require Yarn.

## Verification

Run from a clean clone:

```
nvm use && corepack enable && pnpm install
pnpm lint && pnpm types && pnpm build
```
