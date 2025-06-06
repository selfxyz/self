import { DEFAULT_DOB, DEFAULT_DOE, DEFAULT_PNUMBER } from '@env';
import { create } from 'zustand';

interface UserState {
  passportNumber: string;
  dateOfBirth: string;
  dateOfExpiry: string;
  selectedDocumentType?: string;
  deepLinkName?: string;
  deepLinkSurname?: string;
  deepLinkNationality?: string;
  deepLinkBirthDate?: string;
  update: (patch: Partial<UserState>) => void;
  deleteMrzFields: () => void;
  setSelectedDocumentType: (documentType: string) => void;
  clearSelectedDocumentType: () => void;
  setDeepLinkUserDetails: (details: {
    name?: string;
    surname?: string;
    nationality?: string;
    birthDate?: string;
  }) => void;
  clearDeepLinkUserDetails: () => void;
}

const useUserStore = create<UserState>((set, _get) => ({
  passportNumber: DEFAULT_PNUMBER ?? '',
  dateOfBirth: DEFAULT_DOB ?? '',
  dateOfExpiry: DEFAULT_DOE ?? '',
  selectedDocumentType: undefined,
  deepLinkName: undefined,
  deepLinkSurname: undefined,
  deepLinkNationality: undefined,
  deepLinkBirthDate: undefined,

  update: patch => {
    set(state => ({ ...state, ...patch }));
  },

  deleteMrzFields: () =>
    set({
      passportNumber: '',
      dateOfBirth: '',
      dateOfExpiry: '',
    }),

  setSelectedDocumentType: documentType =>
    set({ selectedDocumentType: documentType }),

  clearSelectedDocumentType: () => set({ selectedDocumentType: undefined }),

  setDeepLinkUserDetails: details =>
    set({
      deepLinkName: details.name,
      deepLinkSurname: details.surname,
      deepLinkNationality: details.nationality,
      deepLinkBirthDate: details.birthDate,
    }),

  clearDeepLinkUserDetails: () =>
    set({
      deepLinkName: undefined,
      deepLinkSurname: undefined,
      deepLinkNationality: undefined,
      deepLinkBirthDate: undefined,
    }),
}));

export default useUserStore;
