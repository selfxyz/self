import { DEFAULT_DOB, DEFAULT_DOE, DEFAULT_PNUMBER } from '@env';
import { create } from 'zustand';

import { DocumentType } from '../../../common/src/utils/types';

interface UserState {
  passportNumber: string;
  dateOfBirth: string;
  dateOfExpiry: string;
  documentType: DocumentType | null;
  update: (patch: any) => void;
  deleteMrzFields: () => void;
}

const useUserStore = create<UserState>((set, get) => ({
  passportNumber: DEFAULT_PNUMBER ?? '',
  dateOfBirth: DEFAULT_DOB ?? '',
  dateOfExpiry: DEFAULT_DOE ?? '',
  documentType: null,
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
      documentType: null,
    }),
}));

export default useUserStore;
