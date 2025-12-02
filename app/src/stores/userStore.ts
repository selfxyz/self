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
  registeredReferrers: Set<string>;
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
  isReferrerRegistered: (referrer: string) => boolean;
  markReferrerAsRegistered: (referrer: string) => void;
}

const useUserStore = create<UserState>((set, get) => ({
  deepLinkName: undefined,
  deepLinkSurname: undefined,
  deepLinkNationality: undefined,
  deepLinkBirthDate: undefined,
  deepLinkGender: undefined,
  idDetailsDocumentId: undefined,
  deepLinkReferrer: undefined,
  registeredReferrers: new Set<string>(),

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

  isReferrerRegistered: (referrer: string) => {
    const state = get();
    return state.registeredReferrers.has(referrer.toLowerCase());
  },

  markReferrerAsRegistered: (referrer: string) =>
    set(state => {
      const newSet = new Set(state.registeredReferrers);
      newSet.add(referrer.toLowerCase());
      return { registeredReferrers: newSet };
    }),
}));

export default useUserStore;
