// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import { isSuccessfulStatus } from '@/services/points/api';
import { pollEventProcessingStatus } from '@/services/points/eventPolling';
import {
  registerBackupPoints,
  registerNotificationPoints,
  registerReferralPoints,
} from '@/services/points/registerEvents';
import type { PointEventType } from '@/services/points/types';
import { POINT_VALUES } from '@/services/points/types';
import { getPointsAddress } from '@/services/points/utils';
import { usePointEventStore } from '@/stores/pointEventStore';

/**
 * Shared helper to add an event to the store and start polling for processing.
 */
const addEventToStoreAndPoll = async (
  title: string,
  type: PointEventType,
  points: number,
  jobId: string,
): Promise<void> => {
  // Use job_id as the event id
  await usePointEventStore.getState().addEvent(title, type, points, jobId);

  // Start polling in background - don't await
  pollEventProcessingStatus(jobId).then(result => {
    if (result === 'completed') {
      usePointEventStore.getState().markEventAsProcessed(jobId);
    } else if (result === 'failed') {
      usePointEventStore.getState().markEventAsFailed(jobId);
    }
  });
};

/**
 * Records a backup event by registering with API and storing locally.
 *
 * @returns Promise resolving to success status and error message if any
 */
export const recordBackupPointEvent = async (): Promise<{
  success: boolean;
  error?: string;
}> => {
  try {
    const userAddress = await getPointsAddress();
    const response = await registerBackupPoints(userAddress);

    if (
      response.success &&
      isSuccessfulStatus(response.status) &&
      response.jobId
    ) {
      await addEventToStoreAndPoll(
        'Secret backed up',
        'backup',
        POINT_VALUES.backup,
        response.jobId,
      );
      return { success: true };
    }
    return { success: false, error: response.error };
  } catch (error) {
    console.error('Error recording backup point event:', error);
    return {
      success: false,
      error: 'An unexpected error occurred. Please try again.',
    };
  }
};

/**
 * Records a notification event by registering with API and storing locally.
 *
 * @returns Promise resolving to success status and error message if any
 */
export const recordNotificationPointEvent = async (): Promise<{
  success: boolean;
  error?: string;
}> => {
  try {
    const userAddress = await getPointsAddress();
    const response = await registerNotificationPoints(userAddress);

    if (
      response.success &&
      isSuccessfulStatus(response.status) &&
      response.jobId
    ) {
      await addEventToStoreAndPoll(
        'Push notifications enabled',
        'notification',
        POINT_VALUES.notification,
        response.jobId,
      );
      return { success: true };
    }
    return { success: false, error: response.error };
  } catch (error) {
    console.error('Error recording notification point event:', error);
    return {
      success: false,
      error: 'An unexpected error occurred. Please try again.',
    };
  }
};

/**
 * Records a referral event by registering with API and storing locally.
 *
 * @param referrer - The address of the user referring
 * @returns Promise resolving to success status and error message if any
 */
export const recordReferralPointEvent = async (
  referrer: string,
): Promise<{
  success: boolean;
  error?: string;
}> => {
  try {
    const referee = await getPointsAddress();

    // Check if referee and referrer are the same person
    if (referee.toLowerCase().trim() === referrer.toLowerCase().trim()) {
      return {
        success: false,
        error:
          'You cannot refer yourself. Please use a different referral link.',
      };
    }

    const response = await registerReferralPoints({ referee, referrer });

    if (
      response.success &&
      isSuccessfulStatus(response.status) &&
      response.jobId
    ) {
      await addEventToStoreAndPoll(
        'Friend referred',
        'refer',
        POINT_VALUES.referee,
        response.jobId,
      );
      return { success: true };
    }
    return { success: false, error: response.error };
  } catch (error) {
    console.error('Error recording referral point event:', error);
    return {
      success: false,
      error: 'An unexpected error occurred. Please try again.',
    };
  }
};
