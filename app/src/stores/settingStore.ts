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
