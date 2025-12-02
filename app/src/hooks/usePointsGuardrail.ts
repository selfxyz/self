// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import { useCallback } from 'react';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import type { RootStackParamList } from '@/navigation';
import {
  hasUserAnIdentityDocumentRegistered,
  hasUserDoneThePointsDisclosure,
} from '@/services/points';

/**
 * Guard hook that validates points screen access requirements.
 * Redirects to Home if user hasn't:
 * 1. Registered an identity document
 * 2. Completed the points disclosure
 *
 * This prevents users from accessing the Points screen through:
 * - GratificationScreen's "Explore rewards" button
 * - CloudBackupSettings return paths
 * - Any other navigation bypass
 */
export const usePointsGuardrail = () => {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  useFocusEffect(
    useCallback(() => {
      let isActive = true;

      const checkRequirements = async () => {
        const hasDocument = await hasUserAnIdentityDocumentRegistered();
        const hasDisclosed = await hasUserDoneThePointsDisclosure();

        // Only navigate if the screen is still focused
        if (isActive && (!hasDocument || !hasDisclosed)) {
          // User hasn't met requirements, redirect to Home
          navigation.navigate('Home', {});
        }
      };
      checkRequirements();

      return () => {
        isActive = false;
      };
    }, [navigation]),
  );
};
