import { create } from 'zustand';

interface SettingsState {
  hasPrivacyNoteBeenDismissed: boolean;
  dismissPrivacyNote: () => void;
}

export const useSettingStore = create<SettingsState>(set => ({
  hasPrivacyNoteBeenDismissed: false,
  dismissPrivacyNote: () => {
    set({ hasPrivacyNoteBeenDismissed: true });
  },
}));
