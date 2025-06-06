import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

interface PersistedSettingsState {
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
      onRehydrateStorage: () => console.log('Rehydrated settings'),
      partialize: state => {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { hideNetworkModal, setHideNetworkModal, ...persistedState } =
          state;
        return persistedState;
      },
    },
  ),
);
