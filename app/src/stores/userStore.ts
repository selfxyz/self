import { DEFAULT_DOB, DEFAULT_DOE, DEFAULT_PNUMBER } from '@env';
import { create } from 'zustand';

interface UserState {
  passportNumber: string;
  dateOfBirth: string;
  dateOfExpiry: string;
  update: (patch: any) => void;
  deleteMrzFields: () => void;
}

const useUserStore = create<UserState>((set, get) => ({
  passportNumber: DEFAULT_PNUMBER ?? '',
  dateOfBirth: DEFAULT_DOB ?? '',
  dateOfExpiry: DEFAULT_DOE ?? '',

  update: patch => {
    set({
      ...get(),
      ...patch,
    });
  },

  deleteMrzFields: () =>
    set({
      passportNumber: '',
      dateOfBirth: '',
      dateOfExpiry: '',
    }),
}));

export default useUserStore;
