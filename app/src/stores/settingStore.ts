// SPDX-License-Identifier: BUSL-1.1; Copyright (c) 2025 Social Connect Labs, Inc.; Licensed under BUSL-1.1 (see LICENSE); Apache-2.0 from 2029-06-11

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
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { hideNetworkModal, setHideNetworkModal, ...persistedState } =
          state;
        return persistedState;
      },
    },
  ),
);
