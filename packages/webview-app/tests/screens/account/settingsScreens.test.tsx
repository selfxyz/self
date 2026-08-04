// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

// @vitest-environment jsdom

import type React from 'react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { DevModeScreen } from '../../../src/screens/account/DevModeScreen';
import { NotificationPreferencesScreen } from '../../../src/screens/account/NotificationPreferencesScreen';
import { SecurityScreen } from '../../../src/screens/account/SecurityScreen';
import { SettingsScreen } from '../../../src/screens/account/SettingsScreen';

import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';

const analytics = { trackEvent: vi.fn() };
const haptic = { trigger: vi.fn() };
const lifecycle = { dismiss: vi.fn() };

const client = { id: 'client' };

const custody = { lock: vi.fn(), reset: vi.fn() };

vi.mock('../../../src/providers/SelfClientProvider', () => ({
  useSelfClient: () => ({
    analytics,
    haptic,
    lifecycle,
    client,
    custody,
  }),
}));

const operatingMode = {
  mode: 'self-app' as const,
  hostPlatform: undefined as string | undefined,
  capabilities: {
    nfc: true,
    mrzCamera: true,
    biometrics: true,
    secureStorage: true,
    custodyControls: false,
  },
};

vi.mock('../../../src/providers/OperatingModeProvider', () => ({
  useOperatingMode: () => operatingMode,
}));

const { generateMockDocumentMock, mockDocumentStore, storePassportDataMock } = vi.hoisted(() => ({
  generateMockDocumentMock: vi.fn(),
  mockDocumentStore: {
    addDocument: vi.fn(),
    clear: vi.fn(),
    hasDocuments: vi.fn().mockReturnValue(false),
    getCatalog: vi.fn().mockReturnValue({ documents: [] }),
    subscribe: vi.fn().mockReturnValue(() => {}),
  },
  storePassportDataMock: vi.fn(),
}));

vi.mock('@selfxyz/mobile-sdk-alpha', () => ({
  generateMockDocument: (...args: unknown[]) => generateMockDocumentMock(...args),
  storePassportData: (...args: unknown[]) => storePassportDataMock(...args),
}));

vi.mock('../../../src/utils/mockDocumentStore', () => ({
  mockDocumentStore,
}));

vi.mock('@selfxyz/euclid', () => ({
  createSafeAreaProps: ({ top, bottom }: { top: number; bottom: number }) => ({
    insets: { top, bottom, left: 0, right: 0 },
    safeArea: { top, bottom, left: 0, right: 0 },
  }),
  ChatStrokeIcon: () => null,
  CloudKeyIcon: () => null,
  CodeIcon: () => null,
  DocumentDetailsIcon: () => null,
  LeftArrowIcon: () => null,
  LockIcon: () => null,
  TrashIcon: () => null,
  NotificationIcon: () => null,
  QuestionCircleStrokeIcon: () => null,
  ShareIcon: () => null,
  ZapShieldIcon: () => null,
  SettingsViewScreen: ({
    sections,
    bottomSectionItems,
  }: {
    sections: Array<{ items: Array<{ label: string; onPress: () => void }> }>;
    bottomSectionItems: Array<{ label: string; onPress: () => void }>;
  }) => (
    <div>
      {sections.flatMap(section =>
        section.items.map(item => (
          <button key={item.label} onClick={item.onPress} type="button">
            {item.label}
          </button>
        )),
      )}
      {bottomSectionItems.map(item => (
        <button key={item.label} onClick={item.onPress} type="button">
          {item.label}
        </button>
      ))}
    </div>
  ),
  SecurityScreen: ({
    onBack,
    onBackupAccount,
    onRestoreAccount,
    onRevealRecoveryPhrase,
    onDisableBackups,
  }: {
    onBack: () => void;
    onBackupAccount: () => void;
    onRestoreAccount: () => void;
    onRevealRecoveryPhrase: () => void;
    onDisableBackups: () => void;
  }) => (
    <div>
      <button onClick={onBack} type="button">
        Back
      </button>
      <button onClick={onBackupAccount} type="button">
        Back up account
      </button>
      <button onClick={onRevealRecoveryPhrase} type="button">
        Reveal recovery phrase
      </button>
      <button onClick={onRestoreAccount} type="button">
        Restore account
      </button>
      <button onClick={onDisableBackups} type="button">
        Disable backups
      </button>
    </div>
  ),
  NotificationPreferencesScreen: ({
    onBack,
    toggles,
  }: {
    onBack: () => void;
    toggles: Array<{ label: string; value: boolean; onToggleChange: (v: boolean) => void }>;
  }) => (
    <div>
      <button onClick={onBack} type="button">
        Back
      </button>
      {toggles.map(t => (
        <button key={t.label} onClick={() => t.onToggleChange(!t.value)} type="button">
          {t.label}
        </button>
      ))}
    </div>
  ),
  DevModeScreen: ({
    onBack,
    onResetAllValues,
    onGenerateMockDocument,
    documentType,
    nationality,
  }: {
    onBack: () => void;
    onResetAllValues: () => void;
    onGenerateMockDocument: () => void;
    documentType: string;
    nationality: string;
  }) => (
    <div>
      <button onClick={onBack} type="button">
        Back
      </button>
      <button onClick={onResetAllValues} type="button">
        Reset all values
      </button>
      <button onClick={onGenerateMockDocument} type="button">
        Generate mock document
      </button>
      <div data-testid="document-type">{documentType}</div>
      <div data-testid="nationality">{nationality}</div>
    </div>
  ),
}));

const LocationDisplay: React.FC = () => {
  const location = useLocation();
  return <div data-testid="location">{location.pathname}</div>;
};

const renderRoutes = (initialEntries: string[]) =>
  render(
    <MemoryRouter initialEntries={initialEntries}>
      <Routes>
        <Route path="/" element={<LocationDisplay />} />
        <Route path="/settings" element={<SettingsScreen />} />
        <Route path="/settings/security" element={<SecurityScreen />} />
        <Route path="/settings/notifications" element={<NotificationPreferencesScreen />} />
        <Route path="/settings/dev-mode" element={<DevModeScreen />} />
        <Route path="/register/generating" element={<LocationDisplay />} />
        <Route path="/settings/backup" element={<LocationDisplay />} />
        <Route path="/settings/recovery-phrase" element={<LocationDisplay />} />
        <Route path="/recover" element={<LocationDisplay />} />
        <Route path="/docs" element={<LocationDisplay />} />
        <Route path="/coming-soon" element={<LocationDisplay />} />
        <Route path="/tour/1" element={<LocationDisplay />} />
      </Routes>
      <LocationDisplay />
    </MemoryRouter>,
  );

const expectLocation = (expected: string) => {
  const locations = screen.getAllByTestId('location');
  expect(locations.at(-1)?.textContent).toBe(expected);
};

describe('WV-16 settings screens', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    generateMockDocumentMock.mockResolvedValue({ documentCategory: 'passport', mock: true });
    storePassportDataMock.mockResolvedValue(undefined);
    operatingMode.capabilities.custodyControls = false;
    operatingMode.hostPlatform = undefined;
  });

  afterEach(() => {
    cleanup();
  });

  describe('SettingsScreen', () => {
    it('navigates to manage documents', () => {
      renderRoutes(['/settings']);
      fireEvent.click(screen.getByRole('button', { name: /manage documents/i }));
      expectLocation('/docs');
      expect(haptic.trigger).toHaveBeenCalledWith('selection');
    });

    it('navigates to security', () => {
      renderRoutes(['/settings']);
      fireEvent.click(screen.getByRole('button', { name: /security/i }));
      expectLocation('/settings/security');
    });

    it('navigates to notifications', () => {
      renderRoutes(['/settings']);
      fireEvent.click(screen.getByRole('button', { name: /notifications/i }));
      expectLocation('/settings/notifications');
    });

    it('navigates to dev mode', () => {
      renderRoutes(['/settings']);
      fireEvent.click(screen.getByRole('button', { name: /dev mode/i }));
      expectLocation('/settings/dev-mode');
    });

    it('navigates to tunnel flow', () => {
      renderRoutes(['/settings']);
      fireEvent.click(screen.getByRole('button', { name: /tunnel flow/i }));
      expectLocation('/tour/1');
    });

    it('dismisses via lifecycle on close', () => {
      renderRoutes(['/settings']);
      fireEvent.click(screen.getByRole('button', { name: /close self/i }));
      expect(lifecycle.dismiss).toHaveBeenCalledWith({ reason: 'user_cancel' });
      expect(analytics.trackEvent).toHaveBeenCalledWith('settings_dismiss_pressed');
    });

    it('hides custody controls when the host does not advertise them', () => {
      renderRoutes(['/settings']);
      expect(screen.queryByRole('button', { name: /lock extension/i })).toBeNull();
      expect(screen.queryByRole('button', { name: /reset extension/i })).toBeNull();
    });

    it('locks through the custody adapter when advertised', () => {
      operatingMode.capabilities.custodyControls = true;
      renderRoutes(['/settings']);
      fireEvent.click(screen.getByRole('button', { name: /lock extension/i }));
      expect(custody.lock).toHaveBeenCalled();
      expect(analytics.trackEvent).toHaveBeenCalledWith('settings_lock_pressed');
    });

    it('hides Notifications when hosted by the extension', () => {
      operatingMode.hostPlatform = 'chrome-extension';
      renderRoutes(['/settings']);
      expect(screen.queryByRole('button', { name: /notifications/i })).toBeNull();
    });

    it('hides developer tools and coming-soon items on the extension host', () => {
      operatingMode.hostPlatform = 'chrome-extension';
      renderRoutes(['/settings']);
      expect(screen.queryByRole('button', { name: /dev mode/i })).toBeNull();
      expect(screen.queryByRole('button', { name: /disclosure demo/i })).toBeNull();
      expect(screen.queryByRole('button', { name: /tunnel flow/i })).toBeNull();
      expect(screen.queryByRole('button', { name: /get support/i })).toBeNull();
      expect(screen.queryByRole('button', { name: /share self/i })).toBeNull();
    });

    it('shows Notifications on non-extension hosts', () => {
      renderRoutes(['/settings']);
      expect(screen.getByRole('button', { name: /notifications/i })).toBeTruthy();
    });

    it('requires a second press before resetting', () => {
      operatingMode.capabilities.custodyControls = true;
      renderRoutes(['/settings']);
      fireEvent.click(screen.getByRole('button', { name: /reset extension/i }));
      expect(custody.reset).not.toHaveBeenCalled();
      fireEvent.click(screen.getByRole('button', { name: /press again to confirm/i }));
      expect(custody.reset).toHaveBeenCalled();
      expect(analytics.trackEvent).toHaveBeenCalledWith('settings_reset_confirmed');
    });
  });

  describe('SecurityScreen', () => {
    it('navigates to backup method picker', () => {
      renderRoutes(['/settings/security']);
      fireEvent.click(screen.getByRole('button', { name: /back up account/i }));
      expectLocation('/settings/backup');
      expect(analytics.trackEvent).toHaveBeenCalledWith('security_backup_account_pressed');
    });

    it('navigates to recovery phrase', () => {
      renderRoutes(['/settings/security']);
      fireEvent.click(screen.getByRole('button', { name: /reveal recovery phrase/i }));
      expectLocation('/settings/recovery-phrase');
      expect(analytics.trackEvent).toHaveBeenCalledWith('security_reveal_phrase_pressed');
    });

    it('navigates to restore account', () => {
      renderRoutes(['/settings/security']);
      fireEvent.click(screen.getByRole('button', { name: /restore account/i }));
      expectLocation('/recover');
      expect(analytics.trackEvent).toHaveBeenCalledWith('security_restore_account_pressed');
    });

    it('returns to settings on back', () => {
      renderRoutes(['/settings/security']);
      fireEvent.click(screen.getByRole('button', { name: /^back$/i }));
      expectLocation('/settings');
    });
  });

  describe('NotificationPreferencesScreen', () => {
    it('returns to settings on back', () => {
      renderRoutes(['/settings/notifications']);
      fireEvent.click(screen.getByRole('button', { name: /^back$/i }));
      expectLocation('/settings');
    });

    it('tracks toggle changes with analytics', () => {
      renderRoutes(['/settings/notifications']);
      fireEvent.click(screen.getByRole('button', { name: /allow self notifications/i }));
      expect(analytics.trackEvent).toHaveBeenCalledWith('notification_toggle_changed', { key: 'self', value: false });
      expect(haptic.trigger).toHaveBeenCalledWith('selection');
    });
  });

  describe('DevModeScreen', () => {
    it('returns to settings on back', () => {
      renderRoutes(['/settings/dev-mode']);
      fireEvent.click(screen.getByRole('button', { name: /^back$/i }));
      expectLocation('/settings');
    });

    it('generates a mock document and resumes registration', async () => {
      renderRoutes(['/settings/dev-mode']);
      fireEvent.click(screen.getByRole('button', { name: /generate mock document/i }));
      await waitFor(() => {
        expectLocation('/register/generating');
      });
      expect(generateMockDocumentMock).toHaveBeenCalled();
      expect(storePassportDataMock).toHaveBeenCalledWith(client, expect.any(Object));
      expect(analytics.trackEvent).toHaveBeenCalledWith('dev_mode_generate_mock', expect.any(Object));
    });

    it('resets values to defaults', () => {
      renderRoutes(['/settings/dev-mode']);
      fireEvent.click(screen.getByRole('button', { name: /reset all values/i }));
      expect(analytics.trackEvent).toHaveBeenCalledWith('dev_mode_reset');
      expect(haptic.trigger).toHaveBeenCalledWith('selection');
    });
  });

  describe('settings navigation stitching', () => {
    it('stitches settings to security to backup flow', () => {
      renderRoutes(['/settings']);
      fireEvent.click(screen.getByRole('button', { name: /security/i }));
      expectLocation('/settings/security');
      fireEvent.click(screen.getByRole('button', { name: /back up account/i }));
      expectLocation('/settings/backup');
    });

    it('stitches settings to notifications and back', () => {
      renderRoutes(['/settings']);
      fireEvent.click(screen.getByRole('button', { name: /notifications/i }));
      expectLocation('/settings/notifications');
      fireEvent.click(screen.getByRole('button', { name: /^back$/i }));
      expectLocation('/settings');
    });

    it('stitches settings to dev mode and back', () => {
      renderRoutes(['/settings']);
      fireEvent.click(screen.getByRole('button', { name: /dev mode/i }));
      expectLocation('/settings/dev-mode');
      fireEvent.click(screen.getByRole('button', { name: /^back$/i }));
      expectLocation('/settings');
    });
  });
});
