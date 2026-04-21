// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

export type SettingsEntry = {
  label: string;
  route: SettingsRouteKey;
};

export type SettingsGatingContext = {
  platform: SettingsPlatform;
  hasRealDocument: boolean;
  isDevMode: boolean;
  isTroubleshootingMode: boolean;
};

export type SettingsPlatform = 'ios' | 'android' | 'web';

export type SettingsRouteKey =
  | 'ManageDocuments'
  | 'SecurityAndBackup'
  | 'ProofSettings'
  | 'Support'
  | 'share'
  | 'DevSettings'
  | 'Troubleshooting';

export const DEBUG_SETTINGS_ENTRY: SettingsEntry = {
  label: 'Debug menu',
  route: 'DevSettings',
};

export const SETTINGS_ENTRIES_NATIVE: readonly SettingsEntry[] = [
  { label: 'Manage ID documents', route: 'ManageDocuments' },
  { label: 'Security & backup', route: 'SecurityAndBackup' },
  { label: 'Proof settings', route: 'ProofSettings' },
  { label: 'Get support', route: 'Support' },
  { label: 'Share Self app', route: 'share' },
];

export const SETTINGS_ENTRIES_WEB: readonly SettingsEntry[] = [
  { label: 'Manage ID documents', route: 'ManageDocuments' },
  { label: 'Proof settings', route: 'ProofSettings' },
  { label: 'Get support', route: 'Support' },
];

export const TROUBLESHOOTING_ENTRY: SettingsEntry = {
  label: 'Troubleshooting',
  route: 'Troubleshooting',
};

export const baseEntriesForPlatform = (
  platform: SettingsPlatform,
): readonly SettingsEntry[] =>
  platform === 'web' ? SETTINGS_ENTRIES_WEB : SETTINGS_ENTRIES_NATIVE;

// Security & backup houses Cloud backup (iOS: always available; Android:
// requires a real doc) and Reveal recovery phrase (requires a real doc). The
// parent entry is therefore hidden only when no child would be reachable —
// i.e. on Android without a real document. iOS keeps it visible so users can
// still reach Cloud backup.
export const buildSettingsMenu = (
  context: SettingsGatingContext,
): SettingsEntry[] => {
  const { platform, isDevMode, isTroubleshootingMode } = context;
  const base = baseEntriesForPlatform(platform);
  const entries = [
    ...base,
    ...(isTroubleshootingMode ? [TROUBLESHOOTING_ENTRY] : []),
    ...(isDevMode ? [DEBUG_SETTINGS_ENTRY] : []),
  ];
  return entries.filter(entry => shouldShowSettingsEntry(entry, context));
};

export const shouldShowSettingsEntry = (
  entry: SettingsEntry,
  { platform, hasRealDocument }: Omit<SettingsGatingContext, 'isDevMode'>,
): boolean => {
  if (entry.route === 'SecurityAndBackup') {
    return platform !== 'android' || hasRealDocument;
  }
  return true;
};
