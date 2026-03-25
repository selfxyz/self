# WV-09: Registration Core

> Last updated: 2026-03-25
> Status: Ready
> Priority: High
> Depends on: WV-05 (In Progress), WV-06 (Ready)

- Workstream: webview
- Backlog ID: WV-09
- Linear: SELF-2418
- Owner: TBD
- Branch: TBD
- PR: TBD

## Why

The webview app has the middle of the registration flow (country picker, ID
selection, provider launch/result, confirm identification) but is missing
the bookends: the intro tour at the start and the outcome/prompt screens at
the end. A user currently lands on HomeScreen with no onboarding entry point
and sees no registration outcome feedback after provider completion.

The RN app uses its own non-Euclid onboarding screens (Disclaimer,
SaveRecoveryPhrase). The webview app uses Euclid components. The 11 screens
in this spec are all Euclid wrappers — there is no RN reference
implementation to port from. The wrapper pattern is established by existing
screens (HomeScreen, CountryPickerScreen, SettingsScreen).

## Prerequisites

- **WV-05 done** — Sumsub Web SDK integrated in ProviderLaunchScreen
- **WV-06 done** — KYC result persisted via ConfirmIdentificationScreen

WV-07/WV-08 (proving machine) are NOT prerequisites. This spec covers the
registration flow up to and including document ownership confirmation.
Proving is a separate verification session.

## Scope

**11 new Euclid wrapper screens** organized into three groups:

| Group                    | Screens                                                                                                        | Count |
| ------------------------ | -------------------------------------------------------------------------------------------------------------- | ----- |
| Tour                     | LaunchTour1–4                                                                                                  | 4     |
| Registration outcomes    | ScanSuccessScreen, RegistrationFailureScreen, SumsubFailureScreen                                              | 3     |
| Social sign-on & prompts | SocialSignOnMethodPickerScreen, SocialSignOnPickerScreen, ConflictDetectedScreen, PushNotificationPromptScreen | 4     |

Plus route wiring in `App.tsx` and end-to-end integration of the full
registration route chain from tour through provider result.

## What You Will Do

### PR 1: Launch tour route and navigation

#### 1a. Create the production tour screen

**Create:** `packages/webview-app/src/screens/onboarding/TourScreen.tsx`

The tunnel flow already has a `TourScreen` at
`packages/webview-app/src/screens/tunnel/TourScreen.tsx` that demonstrates
the pattern: parameterized route, switch on step number, render
LaunchTour1–4. The production tour screen follows the same structure but
routes into the production onboarding flow instead of the tunnel flow.

```typescript
import React, { useCallback } from 'react';
import { useNavigate, useParams, Navigate } from 'react-router-dom';
import {
  LaunchTour1Screen,
  LaunchTour2Screen,
  LaunchTour3Screen,
  LaunchTour4Screen,
} from '@selfxyz/euclid';
import { useSelfClient } from '../../providers/SelfClientProvider';

const insets = { top: 0, bottom: 0 };

export const TourScreen: React.FC = () => {
  const navigate = useNavigate();
  const { step } = useParams<{ step: string }>();
  const { analytics, haptic } = useSelfClient();
  const stepNum = parseInt(step ?? '1', 10);

  const onNext = useCallback(() => {
    haptic.trigger('selection');
    analytics.trackEvent('tour_next', { step: stepNum });
    if (stepNum < 4) {
      navigate(`/onboarding/tour/${stepNum + 1}`);
    } else {
      navigate('/onboarding/country');
    }
  }, [navigate, stepNum, haptic, analytics]);

  const onRestore = useCallback(() => {
    haptic.trigger('selection');
    analytics.trackEvent('tour_restore_pressed');
    navigate('/recovery');
  }, [navigate, haptic, analytics]);

  const onSkip = useCallback(() => {
    haptic.trigger('selection');
    analytics.trackEvent('tour_skipped');
    navigate('/onboarding/country');
  }, [navigate, haptic, analytics]);

  switch (step) {
    case '1':
      return <LaunchTour1Screen insets={insets} onNext={onNext} onRestore={onRestore} />;
    case '2':
      return <LaunchTour2Screen insets={insets} onNext={onNext} onRestore={onRestore} />;
    case '3':
      return <LaunchTour3Screen insets={insets} onNext={onNext} onRestore={onRestore} />;
    case '4':
      return (
        <LaunchTour4Screen
          insets={insets}
          onNext={onNext}
          onSkip={onSkip}
          onRestore={onRestore}
          onTermsPress={() => window.open('https://self.xyz/terms', '_blank')}
          onPrivacyPress={() => window.open('https://self.xyz/privacy', '_blank')}
        />
      );
    default:
      return <Navigate to="/onboarding/tour/1" replace />;
  }
};
```

#### 1b. Add tour routes to App.tsx

**File:** `packages/webview-app/src/App.tsx`

Add the production tour route:

```typescript
<Route path="/onboarding/tour/:step" element={<OnboardingTourScreen />} />
```

Import as `OnboardingTourScreen` to avoid collision with the tunnel
`TourScreen`. Use the alias:

```typescript
import { TourScreen as OnboardingTourScreen } from './screens/onboarding/TourScreen';
```

#### 1c. Wire HomeScreen to tour entry

The HomeScreen already exists. When the user has no registered document, the
primary CTA should navigate to `/onboarding/tour/1`. Check
`packages/webview-app/src/screens/home/HomeScreen.tsx` — if the "Get
Started" or equivalent CTA navigates elsewhere (e.g., directly to
`/onboarding/country`), update it to go through the tour first.

Do NOT change HomeScreen behavior when the user already has a registered
document.

#### 1d. Validation

```bash
cd packages/webview-app && yarn build
```

**Definition of Done for PR 1:**

- [ ] Production `TourScreen` renders LaunchTour1–4 at `/onboarding/tour/:step`
- [ ] Tour step 4 `onNext` navigates to `/onboarding/country`
- [ ] Tour `onRestore` navigates to `/recovery` (falls through to `/` until WV-14 adds the route)
- [ ] Tour `onSkip` navigates to `/onboarding/country`
- [ ] HomeScreen CTA routes to `/onboarding/tour/1` when no document exists
- [ ] `yarn build` passes

---

### PR 2: Registration outcome screens and onboarding state store

These three screens are terminal states that the registration flow can reach
after provider completion. They are rendered based on the provider result
status and the downstream document persistence outcome.

#### 2-prereq. Create an onboarding state store

**Create:** `packages/webview-app/src/stores/onboardingStore.ts`

The existing onboarding screens pass `countryCode` and `documentType` via
route state (`navigate('/path', { state: { countryCode, documentType } })`).
This breaks when a failure screen needs to retry — the retry target
(`/onboarding/provider`) expects state that was set two screens ago and is
lost after the error redirect.

Create a module-scoped store (same pattern as WV-06's `kycResultStore`)
that persists onboarding context across the registration flow:

```typescript
interface OnboardingState {
  countryCode: string | null;
  documentType: string | null;
}

let _state: OnboardingState = { countryCode: null, documentType: null };

export function setOnboardingState(s: Partial<OnboardingState>): void {
  _state = { ..._state, ...s };
}
export function getOnboardingState(): OnboardingState {
  return _state;
}
export function clearOnboardingState(): void {
  _state = { countryCode: null, documentType: null };
}
```

Update `CountryPickerScreen` to call `setOnboardingState({ countryCode })`
when the user selects a country.

Update `IDSelectionScreen` to call
`setOnboardingState({ documentType })` when the user selects a doc type.
Both screens continue passing state via route state as they do today —
the store is a parallel persistence layer, not a replacement.

Update `ProviderLaunchScreen` to read from `getOnboardingState()` as
fallback when route state is missing (direct navigation or retry from
failure screen).

Update `IDSelectionScreen` to read `countryCode` from
`getOnboardingState()` as fallback when `location.state` is missing, and
derive `documentTypes` from `country-document-types.json` using that
`countryCode`. The JSON lookup is already imported in
`CountryPickerScreen.tsx:9` — use the same import. If `countryCode` is
present but yields no document types from the JSON, redirect to
`/onboarding/country` (same as the guard for missing country).

Call `clearOnboardingState()` from HomeScreen on mount, so stale context
does not leak across sessions.

#### 2a. Create ScanSuccessScreen wrapper

**Create:** `packages/webview-app/src/screens/onboarding/ScanSuccessScreen.tsx`

This screen is shown after ConfirmIdentificationScreen successfully persists
the KYC document (WV-06). It confirms that the document was stored and
registration is complete.

Euclid `ScanSuccessScreen` props:

```typescript
interface ScanSuccessScreenProps extends SafeArea {
  navLabel: string;
  totalSteps: number;
  currentStep: number;
  title: string;
  description: string;
  buttonLabel: string;
  onClose: () => void;
  onHelp?: () => void;
  onFinish: () => void;
}
```

Wrapper implementation:

- `navLabel`: `"Registration"`
- `totalSteps`: `5` (tour → country → id-type → provider → confirm)
- `currentStep`: `5`
- `title`: `"Identity verified"`
- `description`: `"Your document has been securely registered with Self."`
- `buttonLabel`: `"Continue"`
- `onClose`: same as `onFinish` — advances to `/onboarding/backup`
- `onFinish`: navigate to `/onboarding/backup`

Both `onClose` and `onFinish` advance to the backup prompt. The Euclid
screen exposes a close affordance (X button in the nav bar), and allowing
it to skip the prompt chain would let users bypass backup and notification
setup. If product later decides close should exit directly, change `onClose`
to navigate to `/` — but the default is to advance.

```typescript
import { ScanSuccessScreen as EuclidScanSuccessScreen } from '@selfxyz/euclid';

export const ScanSuccessScreen: React.FC = () => {
  const navigate = useNavigate();
  const { analytics, haptic } = useSelfClient();

  const onFinish = useCallback(() => {
    haptic.trigger('success');
    analytics.trackEvent('registration_success_continue');
    navigate('/onboarding/backup');
  }, [navigate, haptic, analytics]);

  const onClose = useCallback(() => {
    analytics.trackEvent('registration_success_close');
    navigate('/onboarding/backup');
  }, [navigate, analytics]);

  return (
    <EuclidScanSuccessScreen
      insets={{ top: 0, bottom: 0 }}
      navLabel="Registration"
      totalSteps={5}
      currentStep={5}
      title="Identity verified"
      description="Your document has been securely registered with Self."
      buttonLabel="Continue"
      onClose={onClose}
      onFinish={onFinish}
    />
  );
};
```

#### 2b. Create RegistrationFailureScreen wrapper

**Create:** `packages/webview-app/src/screens/onboarding/RegistrationFailureScreen.tsx`

Shown when document persistence fails in ConfirmIdentificationScreen or
when the provider returns a non-retryable error.

Euclid `RegistrationFailureScreen` props:

```typescript
interface RegistrationFailureScreenProps extends SafeArea {
  failureTitle: string;
  failureDescription: string;
  onDismiss: () => void;
  onTryDifferentMethod: () => void;
}
```

Wrapper:

- Read `title` and `description` from route state (passed by the screen
  that detected the failure). Generic copy is used when state is missing
  (direct navigation or browser refresh) — this is valid, not an error.
- `onDismiss`: call `lifecycle.dismiss()` then navigate to `/`
- `onTryDifferentMethod`: navigate to `/onboarding/country`

```typescript
import { RegistrationFailureScreen as EuclidRegistrationFailureScreen } from '@selfxyz/euclid';

export const RegistrationFailureScreen: React.FC = () => {
  const navigate = useNavigate();
  const { state } = useLocation();
  const { analytics, haptic, lifecycle } = useSelfClient();

  const title = state?.title ?? 'Registration failed';
  const description = state?.description ?? 'Something went wrong. Please try again.';

  const onDismiss = useCallback(() => {
    haptic.trigger('selection');
    analytics.trackEvent('registration_failure_dismiss');
    lifecycle.dismiss({ reason: 'user_cancel' });
    navigate('/');
  }, [navigate, haptic, analytics, lifecycle]);

  const onTryDifferentMethod = useCallback(() => {
    haptic.trigger('selection');
    analytics.trackEvent('registration_failure_retry');
    navigate('/onboarding/country');
  }, [navigate, haptic, analytics]);

  return (
    <EuclidRegistrationFailureScreen
      insets={{ top: 0, bottom: 0 }}
      failureTitle={title}
      failureDescription={description}
      onDismiss={onDismiss}
      onTryDifferentMethod={onTryDifferentMethod}
    />
  );
};
```

#### 2c. Create SumsubFailureScreen wrapper

**Create:** `packages/webview-app/src/screens/onboarding/SumsubFailureScreen.tsx`

Shown when the KYC provider returns a retryable error or a rejection.

Euclid `SumsubFailureScreen` props:

```typescript
interface SumsubFailureScreenProps extends SafeArea {
  title: string;
  description: string;
  onDismiss: () => void;
  onTryAgain: () => void;
  backgroundSrc?: string;
}
```

Wrapper:

- Read `title` and `description` from route state. Generic copy is used
  when state is missing — this is valid, not an error.
- `onDismiss`: call `lifecycle.dismiss()` then navigate to `/`
- `onTryAgain`: navigate back to `/onboarding/provider` to re-launch Sumsub

```typescript
import { SumsubFailureScreen as EuclidSumsubFailureScreen } from '@selfxyz/euclid';

export const SumsubFailureScreen: React.FC = () => {
  const navigate = useNavigate();
  const { state } = useLocation();
  const { analytics, haptic, lifecycle } = useSelfClient();

  const title = state?.title ?? 'Verification failed';
  const description = state?.description ?? 'The identity verification could not be completed.';

  const onDismiss = useCallback(() => {
    haptic.trigger('selection');
    analytics.trackEvent('sumsub_failure_dismiss');
    lifecycle.dismiss({ reason: 'user_cancel' });
    navigate('/');
  }, [navigate, haptic, analytics, lifecycle]);

  const onTryAgain = useCallback(() => {
    haptic.trigger('selection');
    analytics.trackEvent('sumsub_failure_retry');
    // Onboarding state store preserves countryCode/documentType across
    // the failure redirect, so ProviderLaunchScreen can read it on retry.
    navigate('/onboarding/provider');
  }, [navigate, haptic, analytics]);

  return (
    <EuclidSumsubFailureScreen
      insets={{ top: 0, bottom: 0 }}
      title={title}
      description={description}
      onDismiss={onDismiss}
      onTryAgain={onTryAgain}
    />
  );
};
```

#### 2d. Add outcome routes to App.tsx

**File:** `packages/webview-app/src/App.tsx`

```typescript
<Route path="/onboarding/success" element={<ScanSuccessScreen />} />
<Route path="/onboarding/failure" element={<RegistrationFailureScreen />} />
<Route path="/onboarding/provider-failure" element={<SumsubFailureScreen />} />
```

#### 2e. Wire ProviderResultScreen error paths to outcome screens

**File:** `packages/webview-app/src/screens/onboarding/ProviderResultScreen.tsx`

After WV-06 lands, `ProviderResultScreen` handles success by routing to
`/onboarding/confirm`. The error/cancel paths need to route to the new
outcome screens:

- `error` with `retryable: true` → navigate to `/onboarding/provider-failure`
  with state `{ title, description, retryable: true }`
- `error` with `retryable: false` → navigate to `/onboarding/failure` with
  state `{ title, description }`
- `cancel` → navigate to `/onboarding/failure` with state
  `{ title: 'Verification cancelled', description: '...' }`

Do NOT change the success path (that is WV-06's responsibility).

#### 2f. Wire ConfirmIdentificationScreen success/failure to outcome screens

**File:** `packages/webview-app/src/screens/onboarding/ConfirmIdentificationScreen.tsx`

After WV-06 lands, this screen persists the document and calls
`lifecycle.setResult()`. Update the navigation after successful persistence:

- Success: navigate to `/onboarding/success` instead of `/`
- Catch block (persistence failure): navigate to `/onboarding/failure` with
  state `{ title: 'Registration failed', description: 'Could not save your document. Please try again.' }`

#### 2g. Validation

```bash
cd packages/webview-app && yarn build
```

**Definition of Done for PR 2:**

- [ ] ScanSuccessScreen renders at `/onboarding/success`
- [ ] RegistrationFailureScreen renders at `/onboarding/failure` with route state
- [ ] SumsubFailureScreen renders at `/onboarding/provider-failure` with retry action
- [ ] ProviderResultScreen error paths route to the correct outcome screen
- [ ] ConfirmIdentificationScreen routes to `/onboarding/success` after persistence
- [ ] `yarn build` passes

---

### PR 3: Social sign-on, conflict, and prompt surfaces

These screens are registration-adjacent: they appear after successful
registration to handle account backup, conflict resolution, and
notification opt-in. They are not on the critical verification path but
complete the registration user journey.

#### 3a. Create SocialSignOnMethodPickerScreen wrapper

**Create:** `packages/webview-app/src/screens/onboarding/SocialSignOnMethodPickerScreen.tsx`

Euclid props:

```typescript
interface SocialSignOnMethodPickerScreenProps extends SafeArea {
  onApple: () => void;
  onGoogle: () => void;
  onSeedPhrase: () => void;
  onDismiss: () => void;
}
```

Wrapper:

- `onApple`: analytics → navigate to `/coming-soon`
- `onGoogle`: analytics → navigate to `/coming-soon`
- `onSeedPhrase`: analytics → navigate to `/coming-soon`
- `onDismiss`: analytics → navigate to `/onboarding/notifications`

All three sign-on/backup actions (Apple, Google, seed phrase) route to
`/coming-soon`. Apple/Google require native platform integration, and seed
phrase recovery is WV-14 scope. Do not use different placeholder targets —
they all land in the same deferred state.

```typescript
import { SocialSignOnMethodPickerScreen as EuclidSocialSignOnMethodPicker } from '@selfxyz/euclid';

export const SocialSignOnMethodPickerScreen: React.FC = () => {
  const navigate = useNavigate();
  const { analytics, haptic } = useSelfClient();

  const onApple = useCallback(() => {
    haptic.trigger('selection');
    analytics.trackEvent('social_signon_apple');
    navigate('/coming-soon');
  }, [navigate, haptic, analytics]);

  const onGoogle = useCallback(() => {
    haptic.trigger('selection');
    analytics.trackEvent('social_signon_google');
    navigate('/coming-soon');
  }, [navigate, haptic, analytics]);

  const onSeedPhrase = useCallback(() => {
    haptic.trigger('selection');
    analytics.trackEvent('social_signon_seed_phrase');
    navigate('/coming-soon');
  }, [navigate, haptic, analytics]);

  const onDismiss = useCallback(() => {
    haptic.trigger('selection');
    analytics.trackEvent('social_signon_dismiss');
    navigate('/onboarding/notifications');
  }, [navigate, haptic, analytics]);

  return (
    <EuclidSocialSignOnMethodPicker
      insets={{ top: 0, bottom: 0 }}
      onApple={onApple}
      onGoogle={onGoogle}
      onSeedPhrase={onSeedPhrase}
      onDismiss={onDismiss}
    />
  );
};
```

#### 3b. Create SocialSignOnPickerScreen wrapper

**Create:** `packages/webview-app/src/screens/onboarding/SocialSignOnPickerScreen.tsx`

Euclid props:

```typescript
interface SocialSignOnPickerScreenProps extends SafeArea {
  onApple: () => void;
  onGoogle: () => void;
  onICloud: () => void;
  onGoogleCloud: () => void;
  onSeedPhrase: () => void;
  onDismiss: () => void;
  defaultExpanded?: boolean;
}
```

Same pattern as method picker — all sign-on actions route to `/coming-soon`
until native integration lands. `onDismiss` navigates to
`/onboarding/notifications`.

#### 3c. Create ConflictDetectedScreen wrapper

**Create:** `packages/webview-app/src/screens/onboarding/ConflictDetectedScreen.tsx`

Euclid props:

```typescript
interface ConflictDetectedScreenProps extends SafeArea {
  title: string;
  description: string;
  primaryActionLabel: string;
  secondaryActionLabel: string;
  onPrimaryAction: () => void;
  onSecondaryAction: () => void;
  onClose: () => void;
}
```

Wrapper:

- Read `title`, `description`, `primaryActionLabel`, `secondaryActionLabel`
  from route state. Provide sensible defaults:
  - `title`: `"Account conflict detected"`
  - `description`: `"A different identity is already registered with this account."`
  - `primaryActionLabel`: `"Continue with new"`
  - `secondaryActionLabel`: `"Keep existing"`
- `onPrimaryAction`: analytics → continue registration (navigate forward)
- `onSecondaryAction`: analytics → navigate to `/`
- `onClose`: navigate to `/`

The conflict resolution logic (which account wins, how to merge) depends on
backend infrastructure not yet available in the webview flow. Wire the UI
callbacks and analytics. The actual resolution behavior will be implemented
when the account system supports it.

#### 3d. Create PushNotificationPromptScreen wrapper

**Create:** `packages/webview-app/src/screens/onboarding/PushNotificationPromptScreen.tsx`

Euclid props:

```typescript
interface PushNotificationPromptScreenProps extends SafeArea {
  onEnableNotifications: () => void;
  onDismiss: () => void;
  onClose?: () => void;
}
```

Wrapper:

- `onEnableNotifications`: analytics → request notification permission via
  browser `Notification.requestPermission()` API → navigate to `/`
- `onDismiss`: analytics → navigate to `/`
- `onClose`: navigate to `/`

Push notifications in a WebView context use the browser Notifications API,
not native push. If `Notification` is not available (e.g., in an iframe
without permission policy), skip the request and navigate home.

```typescript
const onEnableNotifications = useCallback(async () => {
  haptic.trigger('selection');
  analytics.trackEvent('push_notification_enable');
  if ('Notification' in window) {
    await Notification.requestPermission();
  }
  navigate('/');
}, [navigate, haptic, analytics]);
```

#### 3e. Add routes to App.tsx

**File:** `packages/webview-app/src/App.tsx`

```typescript
<Route path="/onboarding/backup" element={<SocialSignOnMethodPickerScreen />} />
<Route path="/onboarding/signin" element={<SocialSignOnPickerScreen />} />
<Route path="/onboarding/conflict" element={<ConflictDetectedScreen />} />
<Route path="/onboarding/notifications" element={<PushNotificationPromptScreen />} />
```

#### 3f. Validation

```bash
cd packages/webview-app && yarn build
```

**Definition of Done for PR 3:**

- [ ] SocialSignOnMethodPickerScreen renders at `/onboarding/backup`
- [ ] SocialSignOnPickerScreen renders at `/onboarding/signin`
- [ ] ConflictDetectedScreen renders at `/onboarding/conflict` with route state
- [ ] PushNotificationPromptScreen renders at `/onboarding/notifications`
- [ ] Social sign-on actions route to `/coming-soon` (deferred)
- [ ] Push notification uses browser Notification API with graceful fallback
- [ ] `yarn build` passes

---

### PR 4: End-to-end registration integration

This PR wires the full registration route chain and validates the
end-to-end flow. No new screens — only route sequencing and guard logic.

#### 4a. Wire the post-registration prompt chain

After `ScanSuccessScreen` (registration success), the user should flow
through the prompt screens before landing on HomeScreen:

```
/onboarding/success → /onboarding/backup → /onboarding/notifications → /
```

Update `ScanSuccessScreen.onFinish` to navigate to `/onboarding/backup`
instead of `/`.

Update `SocialSignOnMethodPickerScreen.onDismiss` to navigate to
`/onboarding/notifications`.

Update `PushNotificationPromptScreen.onDismiss` and
`onEnableNotifications` to navigate to `/`.

#### 4b. Add route guards for screens that require upstream state

Screens that read from route state or module-scoped stores need guards or
fallbacks to prevent direct-navigation crashes or empty/broken UI on direct
navigation.

**Existing screens (guard missing today):**

- `IDSelectionScreen`: expects `countryCode` and `documentTypes` from
  `location.state` (`IDSelectionScreen.tsx:45`). Add fallback: read
  `countryCode` from `getOnboardingState()`, derive `documentTypes` from
  `country-document-types.json`. Guard: if no `countryCode` from either
  source, or if the JSON yields no document types for that country,
  redirect to `/onboarding/country`.
- `ProviderLaunchScreen`: expects `countryCode` and `documentType` from
  `location.state` (`ProviderLaunchScreen.tsx:27`). Add fallback: read
  both from `getOnboardingState()`. Guard: if `countryCode` or
  `documentType` is missing from both sources, redirect to
  `/onboarding/id-type`.

**New screens — render with generic copy, do not redirect:**
`RegistrationFailureScreen`, `SumsubFailureScreen`, and
`ConflictDetectedScreen` all have hardcoded fallback copy (e.g.,
`state?.title ?? 'Registration failed'`). These screens render correctly
without route state — the generic copy is the intended fallback, not a
broken state. Do NOT add redirect guards for missing `state` on these
screens. The fallback copy exists precisely so direct navigation or
browser refresh does not crash.

Guard pattern for existing screens (fallback to onboarding store):

```typescript
import countryDocumentTypes from '../../data/country-document-types.json';
import { getOnboardingState } from '../../stores/onboardingStore';

const { state } = useLocation();
const onboardingState = getOnboardingState();
const countryCode = state?.countryCode ?? onboardingState.countryCode;
const documentTypes = state?.documentTypes
  ?? (countryCode ? countryDocumentTypes[countryCode] : null);
if (!countryCode || !documentTypes?.length) {
  return <Navigate to="/onboarding/country" replace />;
}
```

#### 4c. Document the full registration route chain

The complete production registration flow after this spec:

```
/onboarding/tour/1
  → /onboarding/tour/2
  → /onboarding/tour/3
  → /onboarding/tour/4
  → /onboarding/country          (existing)
  → /onboarding/id-type          (existing)
  → /onboarding/provider         (existing — WV-05)
  → /onboarding/provider-result  (existing — WV-06 wires result)
  → /onboarding/confirm          (existing — WV-06 persists document)
  → /onboarding/success          (this spec)
  → /onboarding/backup           (this spec — deferred actions)
  → /onboarding/notifications    (this spec)
  → /                            (HomeScreen)

Error paths:
  /onboarding/provider-result → /onboarding/provider-failure (retryable)
  /onboarding/provider-result → /onboarding/failure (non-retryable / cancel)
  /onboarding/confirm         → /onboarding/failure (persistence error)

Conflict path (when backend supports it):
  /onboarding/confirm → /onboarding/conflict → continue or dismiss
```

#### 4d. Validation

```bash
cd packages/webview-app && yarn build

# Manual end-to-end validation:
# 1. Launch app → HomeScreen CTA goes to /onboarding/tour/1
# 2. Step through tour 1–4 → arrives at /onboarding/country
# 3. Select country → select ID type → provider launches
# 4. Provider success → confirm screen → success screen
# 5. Success → backup prompt → notification prompt → home
# 6. Provider error → failure screen with retry/dismiss
# 7. Direct navigation to /onboarding/success → renders (no guard crash)
# 8. Direct navigation to /onboarding/failure without state → renders generic fallback copy
```

**Definition of Done for PR 4:**

- [ ] Full route chain from tour through notifications works end-to-end
- [ ] Post-registration prompt chain flows: success → backup → notifications → home
- [ ] Route guards prevent crashes on direct navigation
- [ ] Error paths route correctly from ProviderResultScreen
- [ ] `yarn build` passes

## Files You Will Create

| File                                                                             | What                                                         | PR   |
| -------------------------------------------------------------------------------- | ------------------------------------------------------------ | ---- |
| `packages/webview-app/src/stores/onboardingStore.ts`                             | Module-scoped onboarding context (countryCode, documentType) | PR 2 |
| `packages/webview-app/src/screens/onboarding/TourScreen.tsx`                     | Production tour wrapper (LaunchTour1–4)                      | PR 1 |
| `packages/webview-app/src/screens/onboarding/ScanSuccessScreen.tsx`              | Registration success screen                                  | PR 2 |
| `packages/webview-app/src/screens/onboarding/RegistrationFailureScreen.tsx`      | Registration failure screen                                  | PR 2 |
| `packages/webview-app/src/screens/onboarding/SumsubFailureScreen.tsx`            | Provider failure screen                                      | PR 2 |
| `packages/webview-app/src/screens/onboarding/SocialSignOnMethodPickerScreen.tsx` | Backup method picker                                         | PR 3 |
| `packages/webview-app/src/screens/onboarding/SocialSignOnPickerScreen.tsx`       | Sign-on picker                                               | PR 3 |
| `packages/webview-app/src/screens/onboarding/ConflictDetectedScreen.tsx`         | Account conflict screen                                      | PR 3 |
| `packages/webview-app/src/screens/onboarding/PushNotificationPromptScreen.tsx`   | Push notification prompt                                     | PR 3 |

## Files You Will Modify

| File                                                                          | Change                                               | PR     | Risk       |
| ----------------------------------------------------------------------------- | ---------------------------------------------------- | ------ | ---------- |
| `packages/webview-app/src/App.tsx`                                            | Add 9 new routes                                     | PR 1–3 | **Low**    |
| `packages/webview-app/src/screens/home/HomeScreen.tsx`                        | Wire CTA to tour entry                               | PR 1   | **Low**    |
| `packages/webview-app/src/screens/onboarding/CountryPickerScreen.tsx`         | Write to onboarding store on selection               | PR 2   | **Low**    |
| `packages/webview-app/src/screens/onboarding/IDSelectionScreen.tsx`           | Write to onboarding store, add fallback read + guard | PR 2/4 | **Low**    |
| `packages/webview-app/src/screens/onboarding/ProviderLaunchScreen.tsx`        | Add fallback read from onboarding store + guard      | PR 4   | **Low**    |
| `packages/webview-app/src/screens/onboarding/ProviderResultScreen.tsx`        | Wire error paths to outcome screens                  | PR 2   | **Medium** |
| `packages/webview-app/src/screens/onboarding/ConfirmIdentificationScreen.tsx` | Route to success/failure instead of `/`              | PR 2   | **Medium** |
| `packages/webview-app/src/screens/onboarding/ScanSuccessScreen.tsx`           | Wire `onFinish` to backup prompt                     | PR 4   | **Low**    |
| `specs/projects/sdk/workstreams/webview/SPEC.md`                              | Add WV-09 backlog row                                | PR 1   | **None**   |

## Files You Will NOT Modify

| File                                                        | Why                                   |
| ----------------------------------------------------------- | ------------------------------------- |
| `packages/webview-app/src/screens/tunnel/*`                 | Tunnel flow is separate — WV-08 scope |
| `packages/webview-app/src/providers/SelfClientProvider.tsx` | No new adapter requirements           |
| `packages/webview-bridge/**`                                | No bridge changes needed              |
| `packages/mobile-sdk-alpha/**`                              | No SDK changes needed                 |
| `app/**`                                                    | RN app unchanged                      |

## Constraints

- **All screens are Euclid wrappers.** No custom UI. Every screen imports a
  Euclid component and passes props. The wrapper adds navigation, analytics,
  haptics, and route state — nothing else.
- **Follow the established wrapper pattern.** Use `insets={{ top: 0, bottom: 0 }}`,
  `useSelfClient()`, `useNavigate()`, `useCallback()` for all handlers.
  See existing screens (CountryPickerScreen, SettingsScreen) as reference.
- **Social sign-on actions are deferred.** Apple/Google sign-in require native
  platform integration that is out of scope for the webview-only delivery.
  Route to `/coming-soon`. Do not stub auth flows.
- **Conflict resolution is deferred.** The ConflictDetectedScreen wires UI
  callbacks only. Actual account conflict logic depends on backend
  infrastructure not yet available.
- **Push notifications use browser API.** Use `Notification.requestPermission()`
  with a guard for environments where it is unavailable. Do not import any
  native notification module.
- **No modifications to ProviderResultScreen success path.** That is WV-06's
  responsibility. Only wire the error/cancel paths.
- **Route state is the data transport for outcome screens.** Pass `title`,
  `description`, and flags via `navigate(path, { state: {...} })`. Do not
  use URL params for error details.
- **Two guard strategies depending on screen type.** Existing onboarding
  screens (`IDSelectionScreen`, `ProviderLaunchScreen`) that need upstream
  data use fallback-to-store then redirect if data is still missing. New
  outcome screens (`RegistrationFailureScreen`, `SumsubFailureScreen`,
  `ConflictDetectedScreen`) render with generic fallback copy — they do
  not redirect, because a generic error/conflict screen is useful even
  without specific route state.

## Resolved Questions

1. **Why not reuse the tunnel TourScreen?** The tunnel tour routes into
   `/tunnel/kyc` after step 4. The production tour routes into
   `/onboarding/country`. Different exit targets mean different wrappers.
   The Euclid components are shared; only the wrapper differs.

2. **Where does the backup prompt fit?** After registration success, before
   the user lands on HomeScreen. The chain is:
   success → backup → notifications → home. Dismissing any prompt skips
   to the next step.

3. **What about the recovery flow?** `onRestore` in the tour screens navigates
   to `/recovery`. That route does not exist yet — it is WV-14 scope.
   For now it will hit the catch-all `<Navigate to="/" replace />` route.

4. **What copy goes in the outcome screens?** ScanSuccessScreen and
   failure screens use hardcoded copy in the wrapper (title, description,
   buttonLabel). The copy values are listed in the screen sections above.
   If product wants different copy, update the wrapper — no Euclid changes
   needed.

5. **ScanSuccessScreen step counter** — The `totalSteps` and `currentStep`
   props drive the RegistrationNav progress bar. Using 5 total steps
   (tour → country → id-type → provider → confirm) reflects the
   user-visible registration journey. The tour is collapsed to one step
   because it is a single entry point from the user's perspective.

6. **How does retry from provider failure work?** The onboarding state store
   (`onboardingStore.ts`) persists `countryCode` and `documentType` across
   the registration flow. When `SumsubFailureScreen.onTryAgain` navigates
   to `/onboarding/provider`, `ProviderLaunchScreen` reads from the store
   as fallback when route state is missing. This also fixes direct
   navigation to `/onboarding/id-type` or `/onboarding/provider`.

7. **Can ScanSuccessScreen.onClose skip the prompt chain?** No. Both
   `onClose` and `onFinish` advance to `/onboarding/backup`. The Euclid
   screen exposes a close affordance (X button), and allowing it to bypass
   backup/notification setup would create an inconsistent experience. If
   product decides close should exit directly, change `onClose` to `/`.

8. **WV-06 dependency risk** — This spec assumes WV-06 lands as specified:
   ProviderResultScreen routes success to `/onboarding/confirm`, and
   ConfirmIdentificationScreen persists the document and calls
   `lifecycle.setResult()`. The current app still routes success to
   `/proving` and confirm to `/`. If WV-06 lands differently, PR 2
   (outcome screen wiring) will need adjustment. The new screens
   themselves are not affected — only the routing from existing screens.

## Validation

```bash
# webview-app builds
cd packages/webview-app && yarn build
```

## Definition of Done

- [ ] 11 new Euclid wrapper screens created in `packages/webview-app/src/screens/onboarding/`
- [ ] 9 new routes added to App.tsx
- [ ] HomeScreen CTA routes to tour when no document exists
- [ ] Tour steps 1–4 navigate correctly, step 4 exits to country picker
- [ ] ProviderResultScreen error/cancel paths route to outcome screens
- [ ] ConfirmIdentificationScreen routes to success screen on persist
- [ ] Post-registration prompt chain works: success → backup → notifications → home
- [ ] Route guards prevent crashes on direct navigation to state-dependent screens
- [ ] Social sign-on actions route to `/coming-soon`
- [ ] Push notification uses browser Notification API
- [ ] `yarn workspace @selfxyz/webview-app build` passes
- [ ] Backlog row added in SPEC.md

## Status Log

- 2026-03-25: Plan created.
