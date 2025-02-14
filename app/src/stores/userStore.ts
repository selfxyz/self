// import { generateDscSecret } from '../../../common/src/utils/csca';
import { DEFAULT_DOB, DEFAULT_DOE, DEFAULT_PNUMBER } from '@env';
import { resetGenericPassword } from 'react-native-keychain';
import { create } from 'zustand';

interface UserState {
  passportNumber: string;
  dateOfBirth: string;
  dateOfExpiry: string;
  clearSecretFromStorage: () => void;
  update: (patch: any) => void;
  deleteMrzFields: () => void;
}

const useUserStore = create<UserState>((set, get) => ({
  passportNumber: DEFAULT_PNUMBER ?? '',
  dateOfBirth: DEFAULT_DOB ?? '',
  dateOfExpiry: DEFAULT_DOE ?? '',

  clearSecretFromStorage: async () => {
    await resetGenericPassword({ service: 'secret' });
  },

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
