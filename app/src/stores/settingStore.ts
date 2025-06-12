// SPDX-License-Identifier: BSL-1.1
// Copyright (c) 2025 Social Connect Labs, Inc.
//
// This file is licensed under the Business Source License 1.1 (BSL-1.1).
//
// Use of this software is governed by the Business Source License included in the LICENSE file.
//
// As of 2029-06-11, this file will be governed by the Apache License, Version 2.0.
import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

interface SettingsState {
  hasPrivacyNoteBeenDismissed: boolean;
  dismissPrivacyNote: () => void;
  biometricsAvailable: boolean;
  setBiometricsAvailable: (biometricsAvailable: boolean) => void;
  cloudBackupEnabled: boolean;
  toggleCloudBackupEnabled: () => void;
  isDevMode: boolean;
  setDevModeOn: () => void;
  setDevModeOff: () => void;
}

/*
 * This store is used to store the settings of the app. Dont store anything sensative here
 */
export const useSettingStore = create<SettingsState>()(
  persist(
    (set, _get) => ({
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
        })),

      isDevMode: false,
      setDevModeOn: () => set({ isDevMode: true }),
      setDevModeOff: () => set({ isDevMode: false }),
    }),
    {
      name: 'setting-storage',
      storage: createJSONStorage(() => AsyncStorage),
      onRehydrateStorage: () => console.log('Rehydrated settings'),
    },
  ),
);
