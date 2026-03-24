# Euclid 3.0 Settings Integration — Handover

**Branch:** `feat/euclid-settings-screens` (based off `origin/main`)
**Commit:** `feat(webview-app): add Euclid 3.0 settings sub-screens`

## What Was Done

Three new wrapper screens were added to `packages/webview-app/src/screens/account/`:

| File                                | Euclid Component                | Route                     |
| ----------------------------------- | ------------------------------- | ------------------------- |
| `SecurityScreen.tsx`                | `SecurityScreen`                | `/settings/security`      |
| `NotificationPreferencesScreen.tsx` | `NotificationPreferencesScreen` | `/settings/notifications` |
| `DevModeScreen.tsx`                 | `DevModeScreen`                 | `/settings/dev-mode`      |

Routes added to `App.tsx`. `SettingsScreen.tsx` updated with three sections (App settings, Support & feedback, Developer tools) — "Security", "Notifications", and "Dev mode" now navigate to real screens instead of `/coming-soon`.

Each wrapper follows the existing pattern (see `CountryPickerScreen.tsx`): import Euclid component, wire with `useNavigate()` + `useSelfClient()` bridge adapters, manage local UI state.

## Blocker: Euclid Package Publish

The installed `@selfxyz/euclid-web@1.0.2` does **not** export `SecurityScreen`, `NotificationPreferencesScreen`, or `DevModeScreen`. These screens exist on `origin/main` of the **euclid repo** (`/Users/evinova-self/Documents/euclid`) but haven't been published to npm yet.

**To unblock, you need to publish a new version of `@selfxyz/euclid`** (note: package was renamed from `euclid-web` to `euclid` on euclid's `origin/main`).

Steps:

1. In the euclid repo, check out `origin/main` and verify the screens export: `git show origin/main:packages/euclid/src/screens/index.ts`
2. Bump the version and publish (the euclid repo has automated publishing via PR merge of version bump PRs)
3. In the self repo, update `packages/webview-app/package.json` to use the new version (and rename dependency from `@selfxyz/euclid-web` to `@selfxyz/euclid` if the package name changed)
4. Run `yarn install` to pull the new package
5. Run `yarn workspace @selfxyz/webview-app exec tsc --noEmit` to verify type-check passes

### Package Rename Note

The euclid repo renamed the web package from `@selfxyz/euclid-web` to `@selfxyz/euclid`. The webview-app still imports from `@selfxyz/euclid-web`. When updating the dependency, you'll also need to update all import paths across the webview-app screens:

```
- import { ... } from '@selfxyz/euclid-web';
+ import { ... } from '@selfxyz/euclid';
```

## Pre-Existing Type Errors

These errors exist on `origin/main` independent of our changes:

- `BridgeProvider.tsx` — `browserHost` not in `WebViewBridgeOptions`
- `SelfClientProvider.tsx` — `lifecycle.dismiss()` argument mismatch
- `ConfirmIdentificationScreen.tsx`, `ProvingScreen.tsx`, `VerificationResultScreen.tsx` — `VerificationResult` type mismatch
- `ProviderLaunchScreen.tsx` — `lifecycle.dismiss()` argument mismatch

## What Still Uses `/coming-soon`

These items in SettingsScreen still navigate to `/coming-soon` (no Euclid screen exists yet):

- **"Manage Documents"** — needs a document management screen
- **"Get support"** — needs external link / bridge intent
- **"Share Self"** — needs native share sheet via bridge

Within the sub-screens, these actions are also stubbed:

- **SecurityScreen**: "Backup your account", "Reveal recovery phrase", "Restore an account" → all go to `/coming-soon` (need native bridge integration for biometric auth, iCloud backup, wallet restore)
- **NotificationPreferencesScreen**: Toggle state is local-only (needs bridge storage persistence)
- **DevModeScreen**: "Generate mock document" tracks analytics and navigates home but doesn't actually create a mock document yet

## Navigation Flow

```
/settings (SettingsViewScreen)
  ├── Manage Documents → /coming-soon
  ├── Security → /settings/security ✅ NEW
  │     ├── Backup your account → /coming-soon
  │     ├── Reveal recovery phrase → /coming-soon
  │     ├── Restore an account → /coming-soon
  │     └── Disable backups → local dialogue toggle
  ├── Notifications → /settings/notifications ✅ NEW
  │     └── Toggles → local state only
  ├── Get support → /coming-soon
  ├── Share Self → /coming-soon
  ├── Dev mode → /settings/dev-mode ✅ NEW
  │     ├── Steppers/toggles → local state
  │     ├── Generate mock document → analytics + navigate home
  │     └── Reset all values → reset state
  └── Close Self → lifecycle.dismiss()
```

## Validation

After unblocking the euclid dependency:

```bash
yarn workspace @selfxyz/webview-app exec tsc --noEmit   # type-check
yarn workspace @selfxyz/webview-app build                # Vite production build
yarn lint                                                 # lint
```

## Related Resources

- **Implementation plan:** `docs/superpowers/plans/2026-03-22-settings-screen-integration.md`
- **Euclid screen source:** `euclid repo origin/main:packages/euclid/src/screens/settings/`
- **Euclid storybook stories:** `euclid repo origin/main:packages/storybook/stories/*Screen.stories.tsx`
- **Linear tickets:** SELF-2223 (Settings), SELF-2311 (Update core app)
