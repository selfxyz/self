// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
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
  setSkipDocumentSelector: (value: boolean) => void;
  setSkipDocumentSelectorIfSingle: (value: boolean) => void;
  setSubscribedTopics: (topics: string[]) => void;
  setTurnkeyBackupEnabled: (turnkeyBackupEnabled: boolean) => void;
  skipDocumentSelector: boolean;
  skipDocumentSelectorIfSingle: boolean;
  subscribedTopics: string[];
  toggleCloudBackupEnabled: () => void;
  turnkeyBackupEnabled: boolean;
}

interface NonPersistedSettingsState {
  hideNetworkModal: boolean;
  setHideNetworkModal: (hideNetworkModal: boolean) => void;
}

type SettingsState = PersistedSettingsState & NonPersistedSettingsState;

/*
 * This store is used to store the settings of the app. Dont store anything sensative here
 */
export const useSettingStore = create<SettingsState>()(
  persist(
    (set, _get) => ({
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

      // Document selector skip settings
      skipDocumentSelector: false,
      setSkipDocumentSelector: (value: boolean) =>
        set({ skipDocumentSelector: value }),
      skipDocumentSelectorIfSingle: true,
      setSkipDocumentSelectorIfSingle: (value: boolean) =>
        set({ skipDocumentSelectorIfSingle: value }),

      // Non-persisted state (will not be saved to storage)
      hideNetworkModal: false,
      setHideNetworkModal: (hideNetworkModal: boolean) => {
        set({ hideNetworkModal });
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
        return persistedState;
      },
    },
  ),
);
