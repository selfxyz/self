// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import {
  buildSettingsMenu,
  shouldShowSettingsEntry,
} from '@/screens/account/settings/settingsMenu';

describe('settingsMenu', () => {
  describe('buildSettingsMenu', () => {
    it('iOS with real doc: full native order, no debug', () => {
      const menu = buildSettingsMenu({
        platform: 'ios',
        hasRealDocument: true,
        isDevMode: false,
      });
      expect(menu.map(e => e.route)).toEqual([
        'ManageDocuments',
        'SecurityAndBackup',
        'ProofSettings',
        'Support',
        'share',
      ]);
    });

    it('iOS with no real doc: keeps Security & backup so Cloud backup stays reachable', () => {
      const menu = buildSettingsMenu({
        platform: 'ios',
        hasRealDocument: false,
        isDevMode: false,
      });
      expect(menu.map(e => e.route)).toContain('SecurityAndBackup');
    });

    it('Android with no real doc: hides Security & backup (both children unreachable)', () => {
      const menu = buildSettingsMenu({
        platform: 'android',
        hasRealDocument: false,
        isDevMode: false,
      });
      expect(menu.map(e => e.route)).not.toContain('SecurityAndBackup');
      expect(menu.map(e => e.route)).toEqual([
        'ManageDocuments',
        'ProofSettings',
        'Support',
        'share',
      ]);
    });

    it('Android with real doc: Security & backup shown', () => {
      const menu = buildSettingsMenu({
        platform: 'android',
        hasRealDocument: true,
        isDevMode: false,
      });
      expect(menu.map(e => e.route)).toContain('SecurityAndBackup');
    });

    it('web: omits Security & backup and Share regardless of doc state', () => {
      const menu = buildSettingsMenu({
        platform: 'web',
        hasRealDocument: true,
        isDevMode: false,
      });
      expect(menu.map(e => e.route)).toEqual([
        'ManageDocuments',
        'ProofSettings',
        'Support',
      ]);
    });

    it('appends Debug menu when isDevMode is true', () => {
      const menu = buildSettingsMenu({
        platform: 'ios',
        hasRealDocument: true,
        isDevMode: true,
      });
      expect(menu[menu.length - 1].route).toBe('DevSettings');
    });

    it('does not include Debug menu when isDevMode is false', () => {
      const menu = buildSettingsMenu({
        platform: 'ios',
        hasRealDocument: true,
        isDevMode: false,
      });
      expect(menu.map(e => e.route)).not.toContain('DevSettings');
    });
  });

  describe('shouldShowSettingsEntry', () => {
    it('always shows ManageDocuments', () => {
      expect(
        shouldShowSettingsEntry(
          { label: 'Manage ID documents', route: 'ManageDocuments' },
          { platform: 'android', hasRealDocument: false },
        ),
      ).toBe(true);
    });

    it('hides SecurityAndBackup on Android without a real doc', () => {
      expect(
        shouldShowSettingsEntry(
          { label: 'Security & backup', route: 'SecurityAndBackup' },
          { platform: 'android', hasRealDocument: false },
        ),
      ).toBe(false);
    });

    it('shows SecurityAndBackup on iOS without a real doc', () => {
      expect(
        shouldShowSettingsEntry(
          { label: 'Security & backup', route: 'SecurityAndBackup' },
          { platform: 'ios', hasRealDocument: false },
        ),
      ).toBe(true);
    });
  });
});
