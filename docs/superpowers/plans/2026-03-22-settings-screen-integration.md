# Settings Screen Integration — Import Euclid 3.0 Screens into WebView App

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the five `/coming-soon` navigations in the webview-app's SettingsScreen with real Euclid 3.0 sub-screens (Security, Notifications, Dev Mode), plus wire the remaining menu items to appropriate bridge actions.

**Architecture:** Each settings sub-screen gets a thin wrapper in `packages/webview-app/src/screens/account/` that imports the Euclid component from `@selfxyz/euclid-web`, wires it with `useSelfClient()` bridge adapters and `useNavigate()` from React Router, and manages local UI state (e.g. dialogue visibility, toggle values). Routes are added to `App.tsx`. The existing wrapper pattern (see `CountryPickerScreen.tsx`, `ComingSoonScreen.tsx`) is followed exactly.

**Tech Stack:** React, React Router, `@selfxyz/euclid-web` (Euclid 3.0 component library), `@selfxyz/webview-bridge` (bridge adapters)

**Existing pattern to follow:**
```
// webview-app wrapper screen pattern:
import { EuclidScreen } from '@selfxyz/euclid-web';
import { useSelfClient } from '../../providers/SelfClientProvider';
import { useNavigate } from 'react-router-dom';

export const WrapperScreen: React.FC = () => {
  const navigate = useNavigate();
  const { analytics, haptic, lifecycle } = useSelfClient();
  // Wire Euclid props to bridge adapters + React Router
  return <EuclidScreen {...wiredProps} />;
};
```

---

## File Map

| Action | File | Responsibility |
|--------|------|----------------|
| Modify | `packages/webview-app/src/App.tsx` | Add 3 new routes |
| Modify | `packages/webview-app/src/screens/account/SettingsScreen.tsx` | Replace `/coming-soon` navigations with real routes + bridge actions |
| Create | `packages/webview-app/src/screens/account/SecurityScreen.tsx` | Wrapper for Euclid `SecurityScreen` |
| Create | `packages/webview-app/src/screens/account/NotificationPreferencesScreen.tsx` | Wrapper for Euclid `NotificationPreferencesScreen` |
| Create | `packages/webview-app/src/screens/account/DevModeScreen.tsx` | Wrapper for Euclid `DevModeScreen` |

---

## Task 1: SecurityScreen wrapper

The most important sub-screen. Wires backup state, recovery phrase, and restore actions through the bridge.

**Files:**
- Create: `packages/webview-app/src/screens/account/SecurityScreen.tsx`

- [ ] **Step 1: Create SecurityScreen wrapper**

```tsx
// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import React, { useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  SecurityScreen as EuclidSecurityScreen,
  LeftArrowIcon,
  CloudKeyIcon,
  LockIcon,
  ZapShieldIcon,
} from '@selfxyz/euclid-web';

import { useSelfClient } from '../../providers/SelfClientProvider';

export const SecurityScreen: React.FC = () => {
  const navigate = useNavigate();
  const { analytics, haptic, storage } = useSelfClient();
  const [isBackupEnabled, setIsBackupEnabled] = useState(false);
  const [showDisableDialogue, setShowDisableDialogue] = useState(false);

  // TODO: Read actual backup state from bridge storage on mount
  // useEffect(() => { storage.get('backup_enabled').then(...) }, []);

  const onBack = useCallback(() => {
    haptic.trigger('selection');
    navigate('/settings');
  }, [navigate, haptic]);

  const onBackupAccount = useCallback(() => {
    haptic.trigger('selection');
    analytics.trackEvent('security_backup_account_pressed');
    navigate('/coming-soon');
  }, [navigate, haptic, analytics]);

  const onRevealRecoveryPhrase = useCallback(() => {
    haptic.trigger('selection');
    analytics.trackEvent('security_reveal_phrase_pressed');
    navigate('/coming-soon');
  }, [navigate, haptic, analytics]);

  const onRestoreAccount = useCallback(() => {
    haptic.trigger('selection');
    analytics.trackEvent('security_restore_account_pressed');
    navigate('/coming-soon');
  }, [navigate, haptic, analytics]);

  const onDisableBackups = useCallback(() => {
    haptic.trigger('warning');
    setShowDisableDialogue(true);
  }, [haptic]);

  const onDisableICloudBackups = useCallback(() => {
    haptic.trigger('warning');
    analytics.trackEvent('security_backups_disabled');
    setIsBackupEnabled(false);
    setShowDisableDialogue(false);
    // TODO: Persist via bridge storage
  }, [haptic, analytics]);

  const onDismissDialogue = useCallback(() => {
    haptic.trigger('selection');
    setShowDisableDialogue(false);
  }, [haptic]);

  return (
    <EuclidSecurityScreen
      insets={{ top: 0, bottom: 0 }}
      escapeIcon={({ size, color }) => (
        <LeftArrowIcon size={size} color={color} />
      )}
      cloudKeyIcon={CloudKeyIcon}
      lockIcon={LockIcon}
      zapShieldIcon={ZapShieldIcon}
      isBackupEnabled={isBackupEnabled}
      onBack={onBack}
      onBackupAccount={onBackupAccount}
      onRevealRecoveryPhrase={onRevealRecoveryPhrase}
      onRestoreAccount={onRestoreAccount}
      onDisableBackups={onDisableBackups}
      showDisableDialogue={showDisableDialogue}
      onDisableICloudBackups={onDisableICloudBackups}
      onDismissDialogue={onDismissDialogue}
    />
  );
};
```

- [ ] **Step 2: Verify type-check passes**

Run: `cd /Users/evinova-self/Documents/self && yarn workspace @selfxyz/webview-app exec tsc --noEmit`
Expected: No errors related to SecurityScreen

- [ ] **Step 3: Commit**

```bash
git add packages/webview-app/src/screens/account/SecurityScreen.tsx
git commit -m "feat(webview-app): add SecurityScreen wrapper for Euclid 3.0"
```

---

## Task 2: NotificationPreferencesScreen wrapper

Manages toggle state locally (persisted via bridge storage in future).

**Files:**
- Create: `packages/webview-app/src/screens/account/NotificationPreferencesScreen.tsx`

- [ ] **Step 1: Create NotificationPreferencesScreen wrapper**

```tsx
// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import React, { useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  NotificationPreferencesScreen as EuclidNotificationPreferencesScreen,
  LeftArrowIcon,
} from '@selfxyz/euclid-web';

import { useSelfClient } from '../../providers/SelfClientProvider';

const defaultToggles = [
  { key: 'self', label: 'Allow Self notifications', description: 'App updates and more' },
  { key: 'nova', label: 'Allow Nova notifications', description: 'Never miss a mission' },
  { key: 'points', label: 'Allow Self Points notifications', description: 'Points and rewards' },
  { key: 'id_status', label: 'Allow ID status notifications', description: 'Document verification updates' },
];

export const NotificationPreferencesScreen: React.FC = () => {
  const navigate = useNavigate();
  const { analytics, haptic } = useSelfClient();
  const [toggleValues, setToggleValues] = useState<Record<string, boolean>>({
    self: true,
    nova: true,
    points: true,
    id_status: false,
  });

  const onBack = useCallback(() => {
    haptic.trigger('selection');
    navigate('/settings');
  }, [navigate, haptic]);

  const toggles = defaultToggles.map(t => ({
    label: t.label,
    description: t.description,
    value: toggleValues[t.key] ?? false,
    onToggleChange: (value: boolean) => {
      haptic.trigger('selection');
      analytics.trackEvent('notification_toggle_changed', { key: t.key, value });
      setToggleValues(prev => ({ ...prev, [t.key]: value }));
    },
  }));

  return (
    <EuclidNotificationPreferencesScreen
      insets={{ top: 0, bottom: 0 }}
      escapeIcon={({ size, color }) => (
        <LeftArrowIcon size={size} color={color} />
      )}
      onBack={onBack}
      toggles={toggles}
    />
  );
};
```

- [ ] **Step 2: Verify type-check passes**

Run: `cd /Users/evinova-self/Documents/self && yarn workspace @selfxyz/webview-app exec tsc --noEmit`
Expected: No errors related to NotificationPreferencesScreen

- [ ] **Step 3: Commit**

```bash
git add packages/webview-app/src/screens/account/NotificationPreferencesScreen.tsx
git commit -m "feat(webview-app): add NotificationPreferencesScreen wrapper for Euclid 3.0"
```

---

## Task 3: DevModeScreen wrapper

Manages mock document generation state. More complex — has steppers, dropdowns, toggle, and IDCard display.

**Files:**
- Create: `packages/webview-app/src/screens/account/DevModeScreen.tsx`

- [ ] **Step 1: Create DevModeScreen wrapper**

```tsx
// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import React, { useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  DevModeScreen as EuclidDevModeScreen,
  LeftArrowIcon,
} from '@selfxyz/euclid-web';
import type { IDCardProps } from '@selfxyz/euclid-web';

import { useSelfClient } from '../../providers/SelfClientProvider';

const ageOptions = ['18 or older', '21 or older', '25 or older', '30 or older'];
const expiryOptions = ['1 year', '2 years', '5 years', '10 years'];

export const DevModeScreen: React.FC = () => {
  const navigate = useNavigate();
  const { analytics, haptic } = useSelfClient();

  const [documentType, setDocumentType] = useState('passport');
  const [nationality, setNationality] = useState('united states of america');
  const [ageIndex, setAgeIndex] = useState(1);
  const [expiryIndex, setExpiryIndex] = useState(2);
  const [ofacCheck, setOfacCheck] = useState(true);

  const idCard: IDCardProps = {
    variant: 'dev-passport',
    title: 'Developer Passport',
    subtitle: 'Digital credential for developers',
  };

  const onBack = useCallback(() => {
    haptic.trigger('selection');
    navigate('/settings');
  }, [navigate, haptic]);

  const onResetAllValues = useCallback(() => {
    haptic.trigger('selection');
    analytics.trackEvent('dev_mode_reset');
    setDocumentType('passport');
    setNationality('united states of america');
    setAgeIndex(1);
    setExpiryIndex(2);
    setOfacCheck(true);
  }, [haptic, analytics]);

  const onGenerateMockDocument = useCallback(() => {
    haptic.trigger('success');
    analytics.trackEvent('dev_mode_generate_mock', {
      documentType,
      nationality,
      age: ageOptions[ageIndex],
      expiresIn: expiryOptions[expiryIndex],
      ofacCheck,
    });
    navigate('/');
  }, [navigate, haptic, analytics, documentType, nationality, ageIndex, expiryIndex, ofacCheck]);

  return (
    <EuclidDevModeScreen
      insets={{ top: 0, bottom: 0 }}
      escapeIcon={({ size, color }) => (
        <LeftArrowIcon size={size} color={color} />
      )}
      onBack={onBack}
      idCard={idCard}
      documentType={documentType}
      onDocumentTypePress={() => {
        setDocumentType(prev => (prev === 'passport' ? 'id_card' : 'passport'));
      }}
      nationality={nationality}
      onNationalityPress={() => {
        setNationality(prev =>
          prev === 'united states of america' ? 'germany' : 'united states of america',
        );
      }}
      age={ageOptions[ageIndex]}
      onAgeIncrement={() => setAgeIndex(prev => Math.min(prev + 1, ageOptions.length - 1))}
      onAgeDecrement={() => setAgeIndex(prev => Math.max(prev - 1, 0))}
      documentExpiresIn={expiryOptions[expiryIndex]}
      onDocumentExpiresIncrement={() =>
        setExpiryIndex(prev => Math.min(prev + 1, expiryOptions.length - 1))
      }
      onDocumentExpiresDecrement={() => setExpiryIndex(prev => Math.max(prev - 1, 0))}
      ofacCheck={ofacCheck}
      onOfacCheckChange={value => {
        haptic.trigger('selection');
        setOfacCheck(value);
      }}
      onResetAllValues={onResetAllValues}
      onGenerateMockDocument={onGenerateMockDocument}
    />
  );
};
```

- [ ] **Step 2: Verify type-check passes**

Run: `cd /Users/evinova-self/Documents/self && yarn workspace @selfxyz/webview-app exec tsc --noEmit`
Expected: No errors related to DevModeScreen

- [ ] **Step 3: Commit**

```bash
git add packages/webview-app/src/screens/account/DevModeScreen.tsx
git commit -m "feat(webview-app): add DevModeScreen wrapper for Euclid 3.0"
```

---

## Task 4: Wire routes in App.tsx

Add the three new routes under `/settings/*`.

**Files:**
- Modify: `packages/webview-app/src/App.tsx`

- [ ] **Step 1: Add imports and routes**

Add these imports after the existing `SettingsScreen` import (line 16):

```tsx
import { SecurityScreen } from './screens/account/SecurityScreen';
import { NotificationPreferencesScreen } from './screens/account/NotificationPreferencesScreen';
import { DevModeScreen } from './screens/account/DevModeScreen';
```

Add these routes after the `/settings` route (after line 34):

```tsx
<Route path="/settings/security" element={<SecurityScreen />} />
<Route path="/settings/notifications" element={<NotificationPreferencesScreen />} />
<Route path="/settings/dev-mode" element={<DevModeScreen />} />
```

- [ ] **Step 2: Verify type-check passes**

Run: `cd /Users/evinova-self/Documents/self && yarn workspace @selfxyz/webview-app exec tsc --noEmit`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add packages/webview-app/src/App.tsx
git commit -m "feat(webview-app): add settings sub-screen routes"
```

---

## Task 5: Wire SettingsScreen menu items to real routes

Replace the five `/coming-soon` navigations with real routes and bridge actions.

**Files:**
- Modify: `packages/webview-app/src/screens/account/SettingsScreen.tsx`

- [ ] **Step 1: Update SettingsScreen menu items**

Replace the full component with updated navigation wiring. Key changes:
- "View document info" → `navigate('/coming-soon')` (no Euclid screen for this yet — keep as-is)
- "Recovery phrase" → `navigate('/settings/security')` (Security screen handles this)
- "Cloud backup" → `navigate('/settings/security')` (Security screen handles this)
- "Get support" → call `lifecycle.dismiss()` with support intent (or keep `/coming-soon`)
- "Share Self" → call `lifecycle.dismiss()` with share intent (or keep `/coming-soon`)

Additionally, add the Settings sub-sections that match the Euclid Storybook stories:
- **App settings section**: Manage Documents, Security, Notifications
- **Support section**: Support, Send feedback
- **Developer tools section** (conditional): Dev mode

```tsx
// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import React, { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  SettingsViewScreen,
  LeftArrowIcon,
  QuestionCircleStrokeIcon,
  DocumentDetailsIcon,
  LockIcon,
  NotificationIcon,
  ChatStrokeIcon,
  ShareIcon,
  CodeIcon,
} from '@selfxyz/euclid-web';

import { useSelfClient } from '../../providers/SelfClientProvider';

export const SettingsScreen: React.FC = () => {
  const navigate = useNavigate();
  const { analytics, haptic, lifecycle } = useSelfClient();

  const onBack = useCallback(() => {
    haptic.trigger('selection');
    navigate('/');
  }, [navigate, haptic]);

  const onDismiss = useCallback(async () => {
    haptic.trigger('selection');
    analytics.trackEvent('settings_dismiss_pressed');
    lifecycle.dismiss();
  }, [haptic, analytics, lifecycle]);

  return (
    <SettingsViewScreen
      insets={{ top: 0, bottom: 0 }}
      escapeIcon={({ size, color }) => (
        <LeftArrowIcon size={size} color={color} />
      )}
      infoIcon={({ size, color }) => (
        <QuestionCircleStrokeIcon size={size} color={color} />
      )}
      onClose={onBack}
      showBackupInfoBox={false}
      isBackupEnabled={false}
      CTAs={[]}
      sections={[
        {
          title: 'App settings',
          items: [
            {
              icon: DocumentDetailsIcon,
              label: 'Manage Documents',
              description: 'Recovery phrase, passport data',
              onPress: () => {
                haptic.trigger('selection');
                analytics.trackEvent('settings_manage_documents_pressed');
                navigate('/coming-soon');
              },
            },
            {
              icon: LockIcon,
              label: 'Security',
              description: 'Recovery phrase, passport data',
              onPress: () => {
                haptic.trigger('selection');
                analytics.trackEvent('settings_security_pressed');
                navigate('/settings/security');
              },
            },
            {
              icon: NotificationIcon,
              label: 'Notifications',
              description: 'Preferences, notification types',
              onPress: () => {
                haptic.trigger('selection');
                analytics.trackEvent('settings_notifications_pressed');
                navigate('/settings/notifications');
              },
            },
          ],
        },
        {
          title: 'Support & feedback',
          items: [
            {
              icon: ChatStrokeIcon,
              label: 'Get support',
              description: 'Help center & support',
              onPress: () => {
                haptic.trigger('selection');
                analytics.trackEvent('settings_support_pressed');
                navigate('/coming-soon');
              },
            },
            {
              icon: ShareIcon,
              label: 'Share Self',
              description: 'Share Self with friends',
              onPress: () => {
                haptic.trigger('selection');
                analytics.trackEvent('settings_share_pressed');
                navigate('/coming-soon');
              },
            },
          ],
        },
        {
          title: 'Developer tools',
          items: [
            {
              icon: CodeIcon,
              label: 'Dev mode',
              description: 'Manage mock IDs, simulate proofs',
              onPress: () => {
                haptic.trigger('selection');
                analytics.trackEvent('settings_dev_mode_pressed');
                navigate('/settings/dev-mode');
              },
            },
          ],
        },
      ]}
      connectHeading=""
      connectSubheading=""
      connectButtons={[]}
      bottomSectionItems={[
        {
          label: 'Close Self',
          onPress: onDismiss,
        },
      ]}
    />
  );
};
```

- [ ] **Step 2: Verify type-check passes**

Run: `cd /Users/evinova-self/Documents/self && yarn workspace @selfxyz/webview-app exec tsc --noEmit`
Expected: PASS

- [ ] **Step 3: Verify Vite build succeeds**

Run: `cd /Users/evinova-self/Documents/self && yarn workspace @selfxyz/webview-app build`
Expected: Build succeeds, bundle output in `dist/`

- [ ] **Step 4: Commit**

```bash
git add packages/webview-app/src/screens/account/SettingsScreen.tsx
git commit -m "feat(webview-app): wire settings menu to Security, Notifications, and DevMode screens"
```

---

## Task 6: Final validation

- [ ] **Step 1: Full type-check**

Run: `cd /Users/evinova-self/Documents/self && yarn workspace @selfxyz/webview-app exec tsc --noEmit`
Expected: PASS with zero errors

- [ ] **Step 2: Vite production build**

Run: `cd /Users/evinova-self/Documents/self && yarn workspace @selfxyz/webview-app build`
Expected: Build succeeds. Bundle size should be similar to before (~294 KB, may increase slightly with 3 new screens)

- [ ] **Step 3: Lint check**

Run: `cd /Users/evinova-self/Documents/self && yarn lint`
Expected: No new lint errors in changed files

---

## Navigation Flow After Implementation

```
/settings (SettingsViewScreen)
  ├─ "Manage Documents" → /coming-soon (no screen yet)
  ├─ "Security" → /settings/security (SecurityScreen)
  │    ├─ "Backup your account" → /coming-soon (future: backup flow)
  │    ├─ "Reveal recovery phrase" → /coming-soon (future: bridge to native)
  │    ├─ "Restore an account" → /coming-soon (future: restore flow)
  │    └─ "Disable backups" → shows dialogue → local state toggle
  ├─ "Notifications" → /settings/notifications (NotificationPreferencesScreen)
  │    └─ Toggle changes → local state (future: bridge to native prefs)
  ├─ "Get support" → /coming-soon (future: external link)
  ├─ "Share Self" → /coming-soon (future: share sheet via bridge)
  ├─ "Dev mode" → /settings/dev-mode (DevModeScreen)
  │    ├─ Steppers/toggles → local state
  │    ├─ "Generate mock document" → analytics event + navigate home
  │    └─ "Reset all values" → reset local state
  └─ "Close Self" → lifecycle.dismiss()
```

## Out of Scope

- Persisting toggle/backup state via bridge storage (marked with `// TODO` comments)
- Recovery phrase reveal flow (requires biometric auth via bridge)
- Cloud backup flow (requires native iCloud/Google backup APIs)
- Restore account flow (requires native wallet restore)
- Support link / Share sheet (requires native intents via bridge)
- Manage Documents screen (no Euclid screen exists yet)
- `@selfxyz/euclid-web` → `@selfxyz/euclid` package rename (separate dependency update task)
