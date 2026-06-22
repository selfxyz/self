# Patches

This directory holds [pnpm native patches](https://pnpm.io/cli/patch) applied
during install. Each patch is registered under `patchedDependencies` in
`pnpm-workspace.yaml`; pnpm applies it to the package in the virtual store
and fails the install if it does not apply cleanly.

Each patch must have an entry below explaining **why it exists** and **what
would let us drop it**. A patch without a written exit condition is a
maintenance liability.

## Regenerating a patch

```bash
pnpm patch <pkg>@<version>          # writes an editable copy + prints its path
# edit the files in the printed directory
pnpm patch-commit <printed-path>    # regenerates the .patch and updates pnpm-workspace.yaml
```

Bump the version in the `patchedDependencies` key and the filename whenever you
regenerate against a new upstream version, and update the entry below in the
same change.

## Active patches

### `@turnkey__core@1.7.0.patch`

- **Why:** Filters `TurnkeyClient.clearSession` key cleanup to values that look
  like Turnkey P-256 public keys. Without this, Turnkey can treat app-owned
  keychain service names (for example document storage keys) as stale Turnkey
  keys and delete unrelated app data.
- **Drop when:** Turnkey scopes session-key cleanup to its own keys upstream, or
  we move Turnkey storage into an isolated namespace that cannot enumerate
  app-owned keychain services. Re-evaluate on every Turnkey bump.

### `react-native-date-picker@5.0.13.patch`

- **Why:** Removes the iOS `modulesProvider` entry from `react-native-date-picker`'s
  `codegenConfig`. Under React Native 0.83's New Architecture codegen, declaring
  `modulesProvider` causes codegen to emit a `RNDatePickerManager` native module
  symbol that the library does not actually provide on iOS, producing a
  duplicate-symbol / missing-provider error at pod install / build time.
- **Drop when:** `react-native-date-picker` ships a release that either provides
  the `RNDatePickerManager` iOS module or removes `modulesProvider` from its own
  `codegenConfig`. Check on every `react-native-date-picker` bump and on RN minor bumps.

### `react-native-keychain@10.0.0.patch`

- **Why:** Adds an Android `useStrongBox` set-option so callers can opt out of
  StrongBox-backed key generation on devices where StrongBox availability is
  reported but key generation is unreliable. The default remains `true`, matching
  upstream behavior unless the app explicitly disables StrongBox for a write.
- **Drop when:** Upstream `react-native-keychain` exposes equivalent StrongBox
  control, or this app no longer needs Android StrongBox opt-out handling.
  Regenerate the patch without build artifacts when touching it next.

### `react-native-passport-reader@1.0.3.patch`

- **Why:** Extends the Android JS wrapper to forward CAN-mode inputs (`useCan`,
  `canNumber`) to the native passport reader. The app needs this for ID-card
  flows that authenticate with CAN instead of MRZ-derived BAC keys.
- **Drop when:** Upstream `react-native-passport-reader` ships CAN forwarding in
  the Android wrapper, or the app stops using CAN-based NFC reads. Re-evaluate
  when bumping.

### `react-native-svg@15.14.0.patch`

- **Why:** Renames `yoga::StyleLength` to `yoga::StyleSizeLength` in the RNSVG
  shadow-node C++ to match the Yoga API in React Native 0.83. Without it the RNSVG
  Fabric component fails to compile against RN 0.83's bundled Yoga.
- **Drop when:** `react-native-svg` ships a release built against the RN 0.83 Yoga
  API. Check on every `react-native-svg` and RN minor bump.
