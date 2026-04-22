# Passport OCR Camera Permission Gate (SELF-2645)

**Bug:** When the user denies the system camera prompt on the Android passport OCR scan screen, the prompt re-fires repeatedly (the UI "blinks"). On iOS, the camera silently stays black. No way out without accepting or force-quitting.

**Root cause:** Permission is requested by the native Android fragment (`CameraFragment.onResume` in `app/android/android-passport-nfc-reader/app/src/main/java/example/jllarraz/com/passportreader/ui/fragments/CameraFragment.kt:111`). After denial, the permission dialog dismisses, which triggers `onResume` to fire again — which immediately re-requests. iOS has an analogous issue (`QKMRZScannerViewRepresentable.swift:64`) that falls through to a silent `print()`.

**Fix:** Gate the OCR camera at the TypeScript layer — before `<PassportCamera>` mounts. The native fragment's broken permission path never runs. No changes to Kotlin/Swift required.

**Scope:** OCR passport scanning only. **Does not** touch the Didit KYC flow, QR disclosure, or the Android permission code itself (leave as dead code; follow-up ticket).

---

## Choke-point

`DocumentCameraScreen.tsx:89` mounts `<PassportCamera>`. The only way into this screen is from `DocumentOnboardingScreen.tsx:39` via `useHapticNavigation('DocumentCamera')`. Gating that navigation point covers the flow.

A screen-level safety check in `DocumentCameraScreen` handles the edge case where a user reaches it without the gate (e.g., deep link, dev-drawer jump) or revokes permission while the screen is in the background.

## Tasks

### Task 1 — Add `react-native-permissions`

- `app/package.json`: add `"react-native-permissions": "^4.1.5"` to `dependencies`.
- `yarn install`, `cd app/ios && pod install`.
- Add `react-native-permissions` to `app/jest.config.cjs` `transformIgnorePatterns`.
- Add a global mock in `app/jest.setup.js`:
  ```js
  jest.mock('react-native-permissions', () =>
    require('react-native-permissions/mock'),
  );
  ```

### Task 2 — Add `ensureCameraForPassportScan` util

File: `app/src/utils/cameraPermission.ts`

```ts
import { Alert, Linking, Platform } from 'react-native';
import {
  PERMISSIONS,
  RESULTS,
  check,
  openSettings,
  request,
} from 'react-native-permissions';

const CAMERA =
  Platform.OS === 'ios' ? PERMISSIONS.IOS.CAMERA : PERMISSIONS.ANDROID.CAMERA;

async function safeCheck(): Promise<string> {
  try { return await check(CAMERA); } catch { return RESULTS.UNAVAILABLE; }
}
async function safeRequest(): Promise<string> {
  try { return await request(CAMERA); } catch { return RESULTS.UNAVAILABLE; }
}

function openAppSettings(): void {
  openSettings().catch(() => Linking.openSettings().catch(() => {}));
}

function showBlockedAlert(onFallback?: () => void): void {
  const buttons: Array<{ text: string; style?: 'cancel'; onPress?: () => void }> = [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Open Settings', onPress: openAppSettings },
  ];
  if (onFallback) buttons.splice(1, 0, { text: 'Try Alternative Verification', onPress: onFallback });
  Alert.alert(
    'Camera access needed',
    'Self needs camera access to scan your passport. Enable it in Settings to continue.',
    buttons,
  );
}

function showUnavailableAlert(onFallback?: () => void): void {
  Alert.alert(
    'Camera not available',
    "This device doesn't have a camera available. You can still verify your ID with an alternative method.",
    onFallback
      ? [{ text: 'Cancel', style: 'cancel' }, { text: 'Try Alternative Verification', onPress: onFallback }]
      : [{ text: 'OK' }],
  );
}

export async function ensureCameraForPassportScan(opts?: {
  onFallback?: () => void;
}): Promise<boolean> {
  let status = await safeCheck();
  if (status === RESULTS.GRANTED || status === RESULTS.LIMITED) return true;
  if (status === RESULTS.DENIED) {
    status = await safeRequest();
    if (status === RESULTS.GRANTED || status === RESULTS.LIMITED) return true;
  }
  if (status === RESULTS.UNAVAILABLE) showUnavailableAlert(opts?.onFallback);
  else showBlockedAlert(opts?.onFallback);
  return false;
}
```

Tests in `app/tests/src/utils/cameraPermission.test.ts` — same 7 cases as before (granted/limited, denied→granted, denied→blocked, blocked, unavailable, throw, Open Settings callback).

### Task 3 — Gate `DocumentOnboardingScreen`

`app/src/screens/documents/selection/DocumentOnboardingScreen.tsx:39`

Current:
```tsx
const handleCameraPress = useHapticNavigation('DocumentCamera');
```

Replace with:
```tsx
const navigateToCamera = useHapticNavigation('DocumentCamera');
const { launchKycVerification } = useKycLauncher({
  countryCode: countryCode ?? '',
  errorSource: 'mrz_scan_failed',
});
const handleCameraPress = useCallback(async () => {
  const ok = await ensureCameraForPassportScan({ onFallback: launchKycVerification });
  if (ok) navigateToCamera();
}, [launchKycVerification, navigateToCamera]);
```

`useKycLauncher` wires the "Try Alternative Verification" fallback through the existing KYC launcher. (The KYC launcher has no camera gate of its own yet; that's a separate ticket if ever needed.)

### Task 4 — Gate `<PassportCamera>` render in `DocumentCameraScreen`

`app/src/screens/documents/scanning/DocumentCameraScreen.tsx`

This is the iOS black-screen fix **and** the fallback safety net for non-guarded navigation paths.

**Why state-driven, not a navigate-back effect:** an async `useEffect` that navigates back on denial still lets `<PassportCamera>` mount for a frame or two before the effect resolves — on iOS that frame IS the black scanner view the user complained about. Tracking permission in component state and skipping the camera render until confirmed granted eliminates the black flash entirely.

Add a `cameraReady` state, initialized to `null`. Render the native camera only when `cameraReady === true`. On mount and on AppState foreground, re-check. On revocation, flip to `false` and navigate back.

```tsx
import { AppState, Platform } from 'react-native';
import { check, PERMISSIONS, RESULTS } from 'react-native-permissions';

// Inside the component:
const [cameraReady, setCameraReady] = useState<boolean | null>(null);

useEffect(() => {
  const cameraPerm = Platform.OS === 'ios' ? PERMISSIONS.IOS.CAMERA : PERMISSIONS.ANDROID.CAMERA;
  let active = true;
  const verify = async () => {
    try {
      const status = await check(cameraPerm);
      const ok = status === RESULTS.GRANTED || status === RESULTS.LIMITED;
      if (!active) return;
      setCameraReady(ok);
      if (!ok) navigation.goBack();
    } catch {
      if (active) setCameraReady(false);
    }
  };
  verify();
  const sub = AppState.addEventListener('change', (s) => {
    if (s === 'active') verify();
  });
  return () => { active = false; sub.remove(); };
}, [navigation]);
```

Replace the camera render line:

```tsx
// before:
<PassportCamera onPassportRead={onPassportRead} isMounted={isFocused} />

// after:
{cameraReady === true && (
  <PassportCamera onPassportRead={onPassportRead} isMounted={isFocused} />
)}
```

When `cameraReady` is `null` (initial check in flight) or `false` (denied), the Lottie scanning animation still plays over a plain `black` background via the existing `<ExpandableBottomLayout.TopSection backgroundColor={black}>` — visually identical to the existing scan screen chrome, just without a live camera behind it. The effect's `navigation.goBack()` runs on denial so the user doesn't linger here.

No other changes to `DocumentCameraScreen` — `useReadMRZ`, layout, error-injection effect, copy all untouched.

### Task 5 — iOS usage string (optional, nice-to-have)

`app/ios/Self.xcodeproj/project.pbxproj` (Debug + Release) and `app/ios/OpenPassport/Info.plist`:

```
"Self uses your camera to scan your passport. Images are not stored."
```

Current copy ("Needed to scan the passport MRZ.") is technically acceptable; updating is cosmetic.

### Task 6 — Validation gate

```bash
yarn lint && yarn types
cd app && yarn test
cd ios && pod install && xcodebuild -workspace OpenPassport.xcworkspace \
  -scheme OpenPassport -configuration Debug -sdk iphonesimulator \
  -destination 'platform=iOS Simulator,name=iPhone 15' build
cd ../android && ./gradlew assembleDebug
```

### Task 7 — Manual smoke

One iOS simulator + one Android emulator (the Android case is the bug's home):

1. Fresh install → DocumentOnboarding → tap Scan Passport → system prompt → **Deny** (without "Don't ask again"). Expect: NO re-prompt loop. Alert appears with "Open Settings".
2. Tap Open Settings → grant camera → return → retap Scan Passport → camera opens cleanly.
3. Tap Scan Passport again after Deny → system prompt re-fires once (Android re-askable), Deny again → alert, no loop.
4. Device without a camera (emulator with camera disabled) → "Camera not available" alert with fallback.

Record a short clip of the Android Deny flow to prove the loop is gone.

### Task 8 — Open PR

Target `main`. Title: `fix(app): gate passport OCR camera in TS to stop Android permission loop (SELF-2645)`.

---

## Files NOT modified

- `app/android/android-passport-nfc-reader/**` — the inverted `hasCameraPermission()` and the `onResume`-request loop are left in place as dead paths. Follow-up ticket can clean them up.
- `app/ios/QKMRZScannerViewRepresentable.swift` — silent `print()` on denial stays. TS guard prevents the view from mounting without permission.
- `app/src/integrations/kyc/**` — Didit flow untouched. (Separate ticket already tracked this.)
- `app/src/components/native/PassportCamera.tsx` — no prop changes.
- `useReadMRZ`, any MRZ onboarding logic — untouched.
- QR disclosure flow.

## Out of scope

- Cleaning up the Android inverted-`hasCameraPermission` and `onResume` loop code.
- Fixing the Android `ErrorDialog.activity!!.finish()` behavior.
- KYC camera gate (separate ticket).
- Styling / illustrations in the denial Alert (using native `Alert` for minimum surface).

## Why no iOS black screen under this plan

Every iOS path that could show it is closed:

1. **Primary path** (DocumentOnboarding → DocumentCamera): Task 3's gate requests permission and alerts on denial. User never navigates to DocumentCamera without a grant.
2. **Non-guarded path** (deep link, dev-drawer, any future screen that navigates directly): Task 4's `cameraReady` state skips `<PassportCamera>` render until permission is confirmed, and navigates back on denial. The native scanner view never mounts.
3. **Revocation while screen is backgrounded**: Task 4's AppState listener re-checks on foreground → flips `cameraReady` → unmounts `<PassportCamera>` → navigates back.
4. **Device without a camera (`UNAVAILABLE`)**: Task 2's unavailable alert with KYC fallback; user never reaches DocumentCamera.
