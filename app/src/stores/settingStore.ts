// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

type LoggingSeverity = 'debug' | 'info' | 'warn' | 'error';

interface PersistedSettingsState {
  addSubscribedTopic: (topic: string) => void;
  biometricsAvailable: boolean;
  cloudBackupEnabled: boolean;
  dismissPrivacyNote: () => void;
  fcmToken: string | null;
  hasCompletedBackupForPoints: boolean;
  hasCompletedKeychainMigration: boolean;
  hasPrivacyNoteBeenDismissed: boolean;
  hasViewedRecoveryPhrase: boolean;
  homeScreenViewCount: number;
  incrementHomeScreenViewCount: () => void;
  isDevMode: boolean;
  loggingSeverity: LoggingSeverity;
  pointsAddress: string | null;
  supportUuidEnabled: boolean;
  supportUuid: string | null;
  removeSubscribedTopic: (topic: string) => void;
  resetBackupForPoints: () => void;
  setBackupForPointsCompleted: () => void;
  setBiometricsAvailable: (biometricsAvailable: boolean) => void;
  setDevModeOff: () => void;
  setDevModeOn: () => void;
  setFcmToken: (token: string | null) => void;
  setHasViewedRecoveryPhrase: (viewed: boolean) => void;
  setKeychainMigrationCompleted: () => void;
  setLoggingSeverity: (severity: LoggingSeverity) => void;
  setPointsAddress: (address: string | null) => void;
  setSupportUuidEnabled: (enabled: boolean) => void;
  setSupportUuid: (supportUuid: string | null) => void;
  setSkipDocumentSelector: (value: boolean) => void;
  setSubscribedTopics: (topics: string[]) => void;
  setTurnkeyBackupEnabled: (turnkeyBackupEnabled: boolean) => void;
  setUseStrongBox: (useStrongBox: boolean) => void;
  skipDocumentSelector: boolean;
  subscribedTopics: string[];
  toggleCloudBackupEnabled: () => void;
  turnkeyBackupEnabled: boolean;
  useStrongBox: boolean;
}

interface NonPersistedSettingsState {
  hideNetworkModal: boolean;
  setHideNetworkModal: (hideNetworkModal: boolean) => void;
  // Dev-only one-shot flag armed by the "Test registration circuit" debug
  // shortcut. Bypasses only the document "already registered / nullifier"
  // checks so the register circuit runs even when the document is on-chain.
  // The DSC tree check still runs (use testDscCircuitArmed to bypass that).
  testRegistrationCircuitArmed: boolean;
  armTestRegistrationCircuit: () => void;
  consumeTestRegistrationCircuit: () => boolean;
  // Dev-only one-shot flag armed by the "Test DSC circuit" debug shortcut.
  // Bypasses only the DSC tree membership check so the DSC circuit runs even
  // when the DSC is already on-chain.
  testDscCircuitArmed: boolean;
  armTestDscCircuit: () => void;
  consumeTestDscCircuit: () => boolean;
}

type SettingsState = PersistedSettingsState & NonPersistedSettingsState;

export const SETTING_STORE_VERSION = 1;

// v1: force support ID sharing off for all existing users. It is opt-in
// from here on — users can re-enable it in settings when a support agent
// asks for it.
export const migrateSettingStore = (
  persistedState: unknown,
  version: number,
): SettingsState => {
  const state = (persistedState ?? {}) as Partial<SettingsState>;
  if (version < 1) {
    state.supportUuidEnabled = false;
    state.supportUuid = null;
  }
  return state as SettingsState;
};

/*
 * This store is used to store the settings of the app. Dont store anything sensative here
 */
export const useSettingStore = create<SettingsState>()(
  persist(
    (set, get) => ({
      // Persisted state
      hasPrivacyNoteBeenDismissed: false,
      dismissPrivacyNote: () => set({ hasPrivacyNoteBeenDismissed: true }),

      biometricsAvailable: false,
      setBiometricsAvailable: biometricsAvailable =>
        set({
          biometricsAvailable,
        }),

      cloudBackupEnabled: false,
      toggleCloudBackupEnabled: () =>
        set(oldState => ({
          cloudBackupEnabled: !oldState.cloudBackupEnabled,
          homeScreenViewCount: oldState.cloudBackupEnabled
            ? oldState.homeScreenViewCount
            : 0,
        })),

      homeScreenViewCount: 0,
      incrementHomeScreenViewCount: () =>
        set(oldState => {
          if (
            oldState.cloudBackupEnabled ||
            oldState.hasViewedRecoveryPhrase === true
          ) {
            return oldState;
          }
          const nextCount = oldState.homeScreenViewCount + 1;
          return {
            homeScreenViewCount: nextCount >= 100 ? 0 : nextCount,
          };
        }),
      hasViewedRecoveryPhrase: false,
      setHasViewedRecoveryPhrase: viewed =>
        set(oldState => ({
          hasViewedRecoveryPhrase: viewed,
          homeScreenViewCount:
            viewed && !oldState.hasViewedRecoveryPhrase
              ? 0
              : oldState.homeScreenViewCount,
        })),

      isDevMode: false,
      setDevModeOn: () => set({ isDevMode: true }),
      setDevModeOff: () => set({ isDevMode: false }),

      loggingSeverity: __DEV__ ? 'debug' : 'warn',
      setLoggingSeverity: (severity: LoggingSeverity) =>
        set({ loggingSeverity: severity }),

      hasCompletedKeychainMigration: false,
      setKeychainMigrationCompleted: () =>
        set({ hasCompletedKeychainMigration: true }),
      fcmToken: null,
      setFcmToken: (token: string | null) => set({ fcmToken: token }),
      subscribedTopics: [],
      setSubscribedTopics: (topics: string[]) =>
        set({ subscribedTopics: topics }),
      addSubscribedTopic: (topic: string) =>
        set(state => ({
          subscribedTopics: Array.from(
            new Set([...state.subscribedTopics, topic]),
          ),
        })),
      removeSubscribedTopic: (topic: string) =>
        set(state => ({
          subscribedTopics: state.subscribedTopics.filter(t => t !== topic),
        })),

      turnkeyBackupEnabled: false,
      setTurnkeyBackupEnabled: (turnkeyBackupEnabled: boolean) =>
        set({ turnkeyBackupEnabled }),
      hasCompletedBackupForPoints: false,
      setBackupForPointsCompleted: () =>
        set({ hasCompletedBackupForPoints: true }),
      resetBackupForPoints: () => set({ hasCompletedBackupForPoints: false }),
      pointsAddress: null,
      setPointsAddress: (address: string | null) =>
        set({ pointsAddress: address }),

      supportUuidEnabled: false,
      setSupportUuidEnabled: (supportUuidEnabled: boolean) =>
        set({ supportUuidEnabled }),
      supportUuid: null,
      setSupportUuid: (supportUuid: string | null) => set({ supportUuid }),

      // Document selector skip settings
      skipDocumentSelector: false,
      setSkipDocumentSelector: (value: boolean) =>
        set({ skipDocumentSelector: value }),

      // StrongBox setting for Android keystore (default: false)
      useStrongBox: false,
      setUseStrongBox: (useStrongBox: boolean) => set({ useStrongBox }),

      // Non-persisted state (will not be saved to storage)
      hideNetworkModal: false,
      setHideNetworkModal: (hideNetworkModal: boolean) => {
        set({ hideNetworkModal });
      },

      testRegistrationCircuitArmed: false,
      armTestRegistrationCircuit: () =>
        set({ testRegistrationCircuitArmed: true }),
      consumeTestRegistrationCircuit: () => {
        const armed = get().testRegistrationCircuitArmed;
        if (armed) {
          set({ testRegistrationCircuitArmed: false });
        }
        return armed;
      },

      testDscCircuitArmed: false,
      armTestDscCircuit: () => set({ testDscCircuitArmed: true }),
      consumeTestDscCircuit: () => {
        const armed = get().testDscCircuitArmed;
        if (armed) {
          set({ testDscCircuitArmed: false });
        }
        return armed;
      },
    }),
    {
      name: 'setting-storage',
      storage: createJSONStorage(() => AsyncStorage),
      onRehydrateStorage: () => undefined,
      partialize: state => {
        const persistedState = { ...state };
        delete (persistedState as Partial<SettingsState>).hideNetworkModal;
        delete (persistedState as Partial<SettingsState>).setHideNetworkModal;
        delete (persistedState as Partial<SettingsState>)
          .testRegistrationCircuitArmed;
        delete (persistedState as Partial<SettingsState>)
          .armTestRegistrationCircuit;
        delete (persistedState as Partial<SettingsState>)
          .consumeTestRegistrationCircuit;
        delete (persistedState as Partial<SettingsState>).testDscCircuitArmed;
        delete (persistedState as Partial<SettingsState>).armTestDscCircuit;
        delete (persistedState as Partial<SettingsState>).consumeTestDscCircuit;
        return persistedState;
      },
      version: SETTING_STORE_VERSION,
      migrate: migrateSettingStore,
    },
  ),
);

export function waitForSettingStoreHydration(): Promise<void> {
  if (useSettingStore.persist.hasHydrated()) {
    return Promise.resolve();
  }
  return new Promise<void>(resolve => {
    let resolved = false;
    const unsubscribe = useSettingStore.persist.onFinishHydration(() => {
      resolved = true;
      unsubscribe();
      resolve();
    });

    if (useSettingStore.persist.hasHydrated() && !resolved) {
      resolved = true;
      unsubscribe();
      resolve();
    }
  });
}
