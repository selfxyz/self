// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import { create } from 'zustand';
import { DEFAULT_DOB, DEFAULT_DOE, DEFAULT_PNUMBER } from '@env';

import type { IdDocInput } from '@selfxyz/common/utils';

interface UserState {
  documentType: string;
  countryCode: string;
  passportNumber: string;
  dateOfBirth: string;
  dateOfExpiry: string;
  deepLinkName?: string;
  deepLinkSurname?: string;
  deepLinkNationality?: IdDocInput['nationality'];
  deepLinkBirthDate?: string;
  deepLinkGender?: string;
  idDetailsDocumentId?: string;
  update: (patch: Partial<UserState>) => void;
  deleteMrzFields: () => void;
  setIdDetailsDocumentId: (documentId: string) => void;
  setDeepLinkUserDetails: (details: {
    name?: string;
    surname?: string;
    nationality?: IdDocInput['nationality'];
    birthDate?: string;
    gender?: string;
  }) => void;
  clearDeepLinkUserDetails: () => void;
}

const useUserStore = create<UserState>((set, _get) => ({
  passportNumber: DEFAULT_PNUMBER ?? '',
  documentType: '',
  countryCode: '',
  dateOfBirth: DEFAULT_DOB ?? '',
  dateOfExpiry: DEFAULT_DOE ?? '',
  deepLinkName: undefined,
  deepLinkSurname: undefined,
  deepLinkNationality: undefined,
  deepLinkBirthDate: undefined,
  deepLinkGender: undefined,
  idDetailsDocumentId: undefined,

  update: patch => {
    set(state => ({ ...state, ...patch }));
  },

  deleteMrzFields: () =>
    set({
      documentType: '',
      passportNumber: '',
      countryCode: '',
      dateOfBirth: '',
      dateOfExpiry: '',
    }),

  setDeepLinkUserDetails: details =>
    set({
      deepLinkName: details.name,
      deepLinkSurname: details.surname,
      deepLinkNationality: details.nationality,
      deepLinkBirthDate: details.birthDate,
      deepLinkGender: details.gender,
    }),

  setIdDetailsDocumentId: (documentId: string) =>
    set({ idDetailsDocumentId: documentId }),

  clearDeepLinkUserDetails: () =>
    set({
      deepLinkName: undefined,
      deepLinkSurname: undefined,
      deepLinkNationality: undefined,
      deepLinkBirthDate: undefined,
      deepLinkGender: undefined,
    }),
}));

export default useUserStore;
