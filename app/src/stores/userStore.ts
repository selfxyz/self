import { create } from 'zustand';

import { DEFAULT_DOB, DEFAULT_DOE, DEFAULT_PNUMBER } from '../config';

interface UserState {
  passportNumber: string;
  dateOfBirth: string;
  dateOfExpiry: string;
  update: (patch: object) => void;
  deleteMrzFields: () => void;
}

const useUserStore = create<UserState>((set, get) => ({
  passportNumber: DEFAULT_PNUMBER ?? '',
  dateOfBirth: DEFAULT_DOB ?? '',
  dateOfExpiry: DEFAULT_DOE ?? '',

  update: (patch: object): void => {
    set({
      ...get(),
      ...patch,
    });
  },

  deleteMrzFields: (): void =>
    set({
      passportNumber: '',
      dateOfBirth: '',
      dateOfExpiry: '',
    }),
}));

export default useUserStore;
