// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import { useCallback } from 'react';
import { AppState } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';

import { useAuth } from '@/providers/authProvider';
import { useSettingStore } from '@/stores/settingStore';

/**
 * Whether biometric unlock is currently available, re-read from the OS whenever
 * the screen using this hook is focused and whenever the app returns to the
 * foreground.
 *
 * Both triggers are needed: focus alone misses the user leaving to OS settings
 * and coming back, because the screen stays focused across that round trip;
 * foreground alone misses in-app navigation onto the screen. The check is a
 * capability query, so it never shows a biometric prompt.
 */
export function useBiometricsAvailability(): boolean {
  const { checkBiometricsAvailable } = useAuth();
  const biometricsAvailable = useSettingStore(
    state => state.biometricsAvailable,
  );
  const setBiometricsAvailable = useSettingStore(
    state => state.setBiometricsAvailable,
  );

  useFocusEffect(
    useCallback(() => {
      let active = true;

      const refresh = () => {
        checkBiometricsAvailable()
          .then(available => {
            if (active) {
              setBiometricsAvailable(available);
            }
          })
          .catch(() => {
            // Keep the last known value; a failed capability query is not
            // evidence that biometrics are unavailable.
          });
      };

      refresh();
      const subscription = AppState.addEventListener('change', nextAppState => {
        if (nextAppState === 'active') {
          refresh();
        }
      });

      return () => {
        active = false;
        subscription.remove();
      };
    }, [checkBiometricsAvailable, setBiometricsAvailable]),
  );

  return biometricsAvailable;
}
