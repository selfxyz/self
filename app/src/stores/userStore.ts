// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import { create } from 'zustand';

import type { IdDocInput } from '@selfxyz/common/utils';

interface UserState {
  deepLinkName?: string;
  deepLinkSurname?: string;
  deepLinkNationality?: IdDocInput['nationality'];
  deepLinkBirthDate?: string;
  deepLinkGender?: string;
  deepLinkReferrer?: string;
  idDetailsDocumentId?: string;
  update: (patch: Partial<UserState>) => void;
  setIdDetailsDocumentId: (documentId: string) => void;
  setDeepLinkReferrer: (referrer: string) => void;
  setDeepLinkUserDetails: (details: {
    name?: string;
    surname?: string;
    nationality?: IdDocInput['nationality'];
    birthDate?: string;
    gender?: string;
  }) => void;
  clearDeepLinkUserDetails: () => void;
  clearDeepLinkReferrer: () => void;
}

const useUserStore = create<UserState>((set, _get) => ({
  deepLinkName: undefined,
  deepLinkSurname: undefined,
  deepLinkNationality: undefined,
  deepLinkBirthDate: undefined,
  deepLinkGender: undefined,
  idDetailsDocumentId: undefined,
  deepLinkReferrer: undefined,

  update: patch => {
    set(state => ({ ...state, ...patch }));
  },

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

  setDeepLinkReferrer: (referrer: string) =>
    set({ deepLinkReferrer: referrer }),

  clearDeepLinkReferrer: () => set({ deepLinkReferrer: undefined }),
}));

export default useUserStore;
