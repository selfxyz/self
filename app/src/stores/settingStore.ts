import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

interface SettingsState {
  hasPrivacyNoteBeenDismissed: boolean;
  dismissPrivacyNote: () => void;
}

/*
 * This store is used to store the settings of the app. Dont store anything sensative here
 */
export const useSettingStore = create<SettingsState>()(
  persist(
    (set, _get) => ({
      hasPrivacyNoteBeenDismissed: false,
      dismissPrivacyNote: () => set({ hasPrivacyNoteBeenDismissed: true }),
    }),
    {
      name: 'setting-storage',
      storage: createJSONStorage(() => AsyncStorage),
      onRehydrateStorage: () => console.log('Rehydrated settings'),
    },
  ),
);
