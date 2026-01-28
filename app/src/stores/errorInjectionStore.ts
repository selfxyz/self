// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { IS_DEV_MODE } from '@/utils/devUtils';

export type InjectedErrorType =
  | 'mrz_invalid_format'
  | 'mrz_unknown_error'
  | 'nfc_timeout'
  | 'nfc_module_unavailable'
  | 'nfc_parse_failure'
  | 'proving_error'
  | 'proving_passport_not_supported'
  | 'api_network_error'
  | 'api_timeout'
  | 'sumsub_initialization'
  | 'sumsub_verification';

export const ERROR_GROUPS = {
  MRZ: ['mrz_invalid_format', 'mrz_unknown_error'] as InjectedErrorType[],
  NFC: [
    'nfc_timeout',
    'nfc_module_unavailable',
    'nfc_parse_failure',
  ] as InjectedErrorType[],
  Proving: [
    'proving_error',
    'proving_passport_not_supported',
  ] as InjectedErrorType[],
  API: ['api_network_error', 'api_timeout'] as InjectedErrorType[],
  Sumsub: [
    'sumsub_initialization',
    'sumsub_verification',
  ] as InjectedErrorType[],
};

export const ERROR_LABELS: Record<InjectedErrorType, string> = {
  mrz_invalid_format: 'MRZ: Invalid format',
  mrz_unknown_error: 'MRZ: Unknown error',
  nfc_timeout: 'NFC: Timeout',
  nfc_module_unavailable: 'NFC: Module unavailable',
  nfc_parse_failure: 'NFC: Parse failure',
  proving_error: 'Proving: Generic error',
  proving_passport_not_supported: 'Proving: Passport not supported',
  api_network_error: 'API: Network error',
  api_timeout: 'API: Timeout',
  sumsub_initialization: 'Sumsub: Initialization error',
  sumsub_verification: 'Sumsub: Verification error',
};

interface ErrorInjectionState {
  injectedErrors: InjectedErrorType[];
  clearOnTrigger: boolean;
  // Actions
  setInjectedErrors: (errors: InjectedErrorType[]) => void;
  toggleError: (error: InjectedErrorType) => void;
  clearError: (error: InjectedErrorType) => void;
  clearAllErrors: () => void;
  setClearOnTrigger: (value: boolean) => void;
  shouldTrigger: (error: InjectedErrorType) => boolean;
}

export const useErrorInjectionStore = create<ErrorInjectionState>()(
  persist(
    (set, get) => ({
      injectedErrors: [],
      clearOnTrigger: true,

      setInjectedErrors: (errors: InjectedErrorType[]) => {
        if (!IS_DEV_MODE) return;
        set({ injectedErrors: errors });
      },

      toggleError: (error: InjectedErrorType) => {
        if (!IS_DEV_MODE) return;
        set(state => {
          const hasError = state.injectedErrors.includes(error);
          return {
            injectedErrors: hasError
              ? state.injectedErrors.filter(e => e !== error)
              : [...state.injectedErrors, error],
          };
        });
      },

      clearError: (error: InjectedErrorType) => {
        if (!IS_DEV_MODE) return;
        set(state => ({
          injectedErrors: state.injectedErrors.filter(e => e !== error),
        }));
      },

      clearAllErrors: () => {
        if (!IS_DEV_MODE) return;
        set({ injectedErrors: [] });
      },

      setClearOnTrigger: (value: boolean) => {
        if (!IS_DEV_MODE) return;
        set({ clearOnTrigger: value });
      },

      shouldTrigger: (error: InjectedErrorType) => {
        if (!IS_DEV_MODE) return false;
        const state = get();
        const shouldTrigger = state.injectedErrors.includes(error);
        if (shouldTrigger && state.clearOnTrigger) {
          state.clearError(error);
        }
        return shouldTrigger;
      },
    }),
    {
      name: 'error-injection-storage',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
