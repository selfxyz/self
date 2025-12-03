// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface PersistedSettingsState {
  hasPrivacyNoteBeenDismissed: boolean;
  dismissPrivacyNote: () => void;
  biometricsAvailable: boolean;
  setBiometricsAvailable: (biometricsAvailable: boolean) => void;
  cloudBackupEnabled: boolean;
  toggleCloudBackupEnabled: () => void;
  loginCount: number;
  incrementLoginCount: () => void;
  hasViewedRecoveryPhrase: boolean;
  setHasViewedRecoveryPhrase: (viewed: boolean) => void;
  isDevMode: boolean;
  setDevModeOn: () => void;
  setDevModeOff: () => void;
  hasCompletedKeychainMigration: boolean;
  setKeychainMigrationCompleted: () => void;
  fcmToken: string | null;
  setFcmToken: (token: string | null) => void;
  turnkeyBackupEnabled: boolean;
  setTurnkeyBackupEnabled: (turnkeyBackupEnabled: boolean) => void;
  subscribedTopics: string[];
  setSubscribedTopics: (topics: string[]) => void;
  addSubscribedTopic: (topic: string) => void;
  removeSubscribedTopic: (topic: string) => void;
  hasCompletedBackupForPoints: boolean;
  setBackupForPointsCompleted: () => void;
  resetBackupForPoints: () => void;
  pointsAddress: string | null;
  setPointsAddress: (address: string | null) => void;
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
          loginCount: oldState.cloudBackupEnabled ? oldState.loginCount : 0,
        })),

      loginCount: 0,
      incrementLoginCount: () =>
        set(oldState => ({ loginCount: oldState.loginCount + 1 })),
      hasViewedRecoveryPhrase: false,
      setHasViewedRecoveryPhrase: viewed =>
        set(oldState => ({
          hasViewedRecoveryPhrase: viewed,
          loginCount:
            viewed && !oldState.hasViewedRecoveryPhrase
              ? 0
              : oldState.loginCount,
        })),

      isDevMode: false,
      setDevModeOn: () => set({ isDevMode: true }),
      setDevModeOff: () => set({ isDevMode: false }),

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
