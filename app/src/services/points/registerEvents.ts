// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import { makeApiRequest } from '@/services/points/api';

type VerifyActionResponse = {
  job_id: string;
};

/**
 * Registers backup action with the points API.
 *
 * @param userAddress - The user's wallet address
 * @returns Promise resolving to job_id, operation status and error message if any
 */
export const registerBackupPoints = async (
  userAddress: string,
): Promise<{
  success: boolean;
  status: number;
  error?: string;
  jobId?: string;
}> => {
  const errorMessages: Record<string, string> = {
    already_verified:
      'You have already backed up your secret for this account.',
    unknown_action: 'Invalid action type. Please try again.',
    verification_failed: 'Verification failed. Please try again.',
    invalid_address: 'Invalid wallet address. Please check your account.',
  };

  const response = await makeApiRequest<VerifyActionResponse>(
    '/verify-action',
    {
      action: 'secret_backup',
      address: userAddress,
    },
    errorMessages,
  );

  if (response.success && response.data?.job_id) {
    return {
      success: true,
      status: response.status,
      jobId: response.data.job_id,
    };
  }

  return {
    success: false,
    status: response.status,
    error: response.error,
  };
};

/**
 * Registers push notification action with the points API.
 *
 * @param userAddress - The user's wallet address
 * @returns Promise resolving to job_id, operation status and error message if any
 */
export const registerNotificationPoints = async (
  userAddress: string,
): Promise<{
  success: boolean;
  status: number;
  error?: string;
  jobId?: string;
}> => {
  const errorMessages: Record<string, string> = {
    already_verified:
      'You have already verified push notifications for this account.',
    unknown_action: 'Invalid action type. Please try again.',
    verification_failed:
      'Verification failed. Please ensure you have enabled push notifications.',
    invalid_address: 'Invalid wallet address. Please check your account.',
  };

  const response = await makeApiRequest<VerifyActionResponse>(
    '/verify-action',
    {
      action: 'push_notification',
      address: userAddress,
    },
    errorMessages,
  );

  if (response.success && response.data?.job_id) {
    return {
      success: true,
      status: response.status,
      jobId: response.data.job_id,
    };
  }

  return {
    success: false,
    status: response.status,
    error: response.error,
  };
};

/**
 * Registers a referral relationship between referee and referrer.
 *
 * Calls POST /referrals/refer endpoint.
 *
 * @param referee - The address of the user being referred
 * @param referrer - The address of the user referring
 * @returns Promise resolving to job_id, operation status and error message if any
 */
export const registerReferralPoints = async ({
  referee,
  referrer,
}: {
  referee: string;
  referrer: string;
}): Promise<{
  success: boolean;
  status: number;
  error?: string;
  jobId?: string;
}> => {
  // Check if referee and referrer are the same person
  if (referee.toLowerCase().trim() === referrer.toLowerCase().trim()) {
    return {
      success: false,
      status: 400,
      error: 'You cannot refer yourself. Please use a different referral link.',
    };
  }

  try {
    const response = await makeApiRequest<VerifyActionResponse>(
      '/referrals/refer',
      {
        referee: referee.toLowerCase(),
        referrer: referrer.toLowerCase(),
      },
    );

    if (response.success && response.data?.job_id) {
      return {
        success: true,
        status: response.status,
        jobId: response.data.job_id,
      };
    }

    // For referral endpoint, try to extract message from response
    let errorMessage =
      'Failed to register referral relationship. Please try again.';
    if (response.error) {
      errorMessage = response.error;
    }

    return { success: false, status: response.status, error: errorMessage };
  } catch (error) {
    console.error('Error registering referral points:', error);
    return {
      success: false,
      status: 500,
      error: 'Network error. Please check your connection and try again.',
    };
  }
};
