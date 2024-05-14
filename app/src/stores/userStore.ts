import { create } from 'zustand'
import {
  DEFAULT_PNUMBER,
  DEFAULT_DOB,
  DEFAULT_DOE,
} from '@env';
import { mockPassportData_sha256WithRSAEncryption_65537 } from '../../../common/src/utils/mockPassportData';
import { PassportData } from '../../../common/src/utils/types';

interface UserState {
  passportNumber: string
  dateOfBirth: string
  dateOfExpiry: string
  passportData: PassportData
  update: (patch: any) => void
  deleteMrzFields: () => void
}

const useUserStore = create<UserState>((set, get) => ({
  passportNumber: DEFAULT_PNUMBER ?? "",
  dateOfBirth: DEFAULT_DOB ?? "",
  dateOfExpiry: DEFAULT_DOE ?? "",

  passportData: mockPassportData_sha256WithRSAEncryption_65537,

  update: (patch) => {
    set({
      ...get(),
      ...patch,
    });
  },

  deleteMrzFields: () => set({
    passportNumber: "",
    dateOfBirth: "",
    dateOfExpiry: "",
  }, true),
}))

export default useUserStore