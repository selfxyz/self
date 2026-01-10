// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import { useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import type { SelfApp } from '@selfxyz/common';

import type { RootStackParamList } from '@/navigation';

/**
 * Hook that checks if SelfApp data is stale (missing or empty disclosures)
 * and navigates to Home screen if stale data is detected.
 *
 * Uses a small delay to allow store updates to propagate after navigation
 * (e.g., after QR code scan sets selfApp data).
 */
export function useProofDisclosureStalenessCheck(
  selfApp: SelfApp | null,
  disclosureItems: Array<{ key: string; text: string }>,
  navigation: NativeStackNavigationProp<RootStackParamList>,
) {
  useFocusEffect(
    useCallback(() => {
      // Add a small delay to allow Zustand store updates to propagate
      // after navigation (e.g., when selfApp is set from QR scan)
      const timeoutId = setTimeout(() => {
        if (!selfApp || disclosureItems.length === 0) {
          navigation.navigate({ name: 'Home', params: {} });
        }
      }, 300);

      return () => {
        clearTimeout(timeoutId);
      };
    }, [selfApp, disclosureItems.length, navigation]),
  );
}
