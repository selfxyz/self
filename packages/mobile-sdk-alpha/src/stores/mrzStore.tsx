// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import { create } from 'zustand';

import type { MRZInfo } from '../types/public';

type MRZNeededForNFC = Pick<MRZInfo, 'documentNumber' | 'dateOfBirth' | 'dateOfExpiry'>;

export interface MRZState {
  // Fields needed for NFC scanning
  passportNumber: string;
  dateOfBirth: string;
  dateOfExpiry: string;
  countryCode: string;
  documentType: string;

  // Store actions
  setMRZForNFC: (data: {
    passportNumber: string;
    dateOfBirth: string;
    dateOfExpiry: string;
    countryCode: string;
    documentType: string;
  }) => void;
  clearMRZ: () => void;
  getMRZ: () => MRZNeededForNFC;
  update: (patch: Partial<MRZState>) => void;
}

// TODO: what about the defaults from @env?
const initialState = {
  passportNumber: '',
  dateOfBirth: '',
  dateOfExpiry: '',
  countryCode: '',
  documentType: '',
};

/*
  Never export outside of the mobile sdk. It can cause multiple instances of the store to be created.
 interact with the store thru the self client
*/
export const useMRZStore = create<MRZState>((set, get) => ({
  ...initialState,

  setMRZForNFC: data => {
    set({
      passportNumber: data.passportNumber,
      dateOfBirth: data.dateOfBirth,
      dateOfExpiry: data.dateOfExpiry,
      countryCode: data.countryCode,
      documentType: data.documentType,
    });
  },

  clearMRZ: () => {
    set(initialState);
  },

  getMRZ: (): MRZNeededForNFC => {
    const state = get();
    return {
      documentNumber: state.passportNumber,
      dateOfBirth: state.dateOfBirth,
      dateOfExpiry: state.dateOfExpiry,
    };
  },

  update: (patch: Partial<MRZState>) => {
    set(state => ({ ...state, ...patch }));
  },
}));
