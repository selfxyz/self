// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import { create } from 'zustand';

import type { MRZInfo } from '../types/public';

type MRZNeededForNFC = Pick<MRZInfo, 'documentNumber' | 'dateOfBirth' | 'dateOfExpiry'>;

/**
 * Zustand slice capturing the latest MRZ data extracted during onboarding.
 * Values are persisted in-memory only and cleared after successful NFC scans to
 * reduce the risk of leaking MRZ details if the app crashes. All fields mirror
 * ICAO formatting and should remain unmasked until passed to the NFC adapter.
 */
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

/**
 * Internal MRZ store hook. Consumers should access it via the self client
 * facade so only one store instance exists per SDK runtime. The store persists
 * the most recent MRZ payload until cleared or overwritten.
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
