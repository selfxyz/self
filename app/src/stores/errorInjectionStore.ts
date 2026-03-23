// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
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
  | 'api_network_error'
  | 'api_timeout'
  | 'didit_initialization'
  | 'didit_verification';

export const ERROR_GROUPS = {
  MRZ: ['mrz_invalid_format', 'mrz_unknown_error'] as InjectedErrorType[],
  NFC: [
    'nfc_timeout',
    'nfc_module_unavailable',
    'nfc_parse_failure',
  ] as InjectedErrorType[],
  API: ['api_network_error', 'api_timeout'] as InjectedErrorType[],
  Didit: [
    'didit_initialization',
    'didit_verification',
  ] as InjectedErrorType[],
};

export const ERROR_LABELS: Record<InjectedErrorType, string> = {
  mrz_invalid_format: 'MRZ: Invalid format',
  mrz_unknown_error: 'MRZ: Unknown error',
  nfc_timeout: 'NFC: Timeout',
  nfc_module_unavailable: 'NFC: Module unavailable',
  nfc_parse_failure: 'NFC: Parse failure',
  api_network_error: 'API: Network error',
  api_timeout: 'API: Timeout',
  didit_initialization: 'Didit: Initialization',
  didit_verification: 'Didit: Verification',
};

interface ErrorInjectionState {
  injectedErrors: InjectedErrorType[];
  // Actions
  setInjectedErrors: (errors: InjectedErrorType[]) => void;
  toggleError: (error: InjectedErrorType) => void;
  clearError: (error: InjectedErrorType) => void;
  clearAllErrors: () => void;
  shouldTrigger: (error: InjectedErrorType) => boolean;
}

export const useErrorInjectionStore = create<ErrorInjectionState>()(
  persist(
    (set, get) => ({
      injectedErrors: [],

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

      shouldTrigger: (error: InjectedErrorType) => {
        if (!IS_DEV_MODE) return false;
        const state = get();
        return state.injectedErrors.includes(error);
      },
    }),
    {
      name: 'error-injection-storage',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
