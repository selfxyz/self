// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import { IS_DEV_MODE } from '@/utils/devUtils';
import { makeApiRequest, POINTS_API_BASE_URL } from '@/utils/points/api';

/**
 * Registers backup action with the points API.
 *
 * @param userAddress - The user's wallet address
 * @returns Promise resolving to operation status and error message if any
 */
export const registerBackupPoints = async (
  userAddress: string,
): Promise<{ success: boolean; status: number; error?: string }> => {
  const errorMessages: Record<string, string> = {
    already_verified:
      'You have already backed up your secret for this account.',
    unknown_action: 'Invalid action type. Please try again.',
    verification_failed: 'Verification failed. Please try again.',
    invalid_address: 'Invalid wallet address. Please check your account.',
  };

  const response = await makeApiRequest(
    '/verify-action',
    {
      action: 'secret_backup',
      address: userAddress,
    },
    errorMessages,
  );

  return response;
};

/**
 * Registers push notification action with the points API.
 *
 * @param userAddress - The user's wallet address
 * @returns Promise resolving to operation status and error message if any
 */
export const registerNotificationPoints = async (
  userAddress: string,
): Promise<{ success: boolean; status: number; error?: string }> => {
  const errorMessages: Record<string, string> = {
    already_verified:
      'You have already verified push notifications for this account.',
    unknown_action: 'Invalid action type. Please try again.',
    verification_failed:
      'Verification failed. Please ensure you have enabled push notifications.',
    invalid_address: 'Invalid wallet address. Please check your account.',
  };

  return makeApiRequest(
    '/verify-action',
    {
      action: 'push_notification',
      address: userAddress,
    },
    errorMessages,
  );
};

/**
 * Registers a referral relationship between referee and referrer.
 *
 * Calls POST /referrals/refer endpoint.
 *
 * @param referee - The address of the user being referred
 * @param referrer - The address of the user referring
 * @returns Promise resolving to operation status and error message if any
 */
export const registerReferralPoints = async ({
  referee,
  referrer,
}: {
  referee: string;
  referrer: string;
}): Promise<{ success: boolean; status: number; error?: string }> => {
  // In __DEV__ mode, log the request instead of sending it
  if (IS_DEV_MODE) {
    // Redact addresses for security - show first 6 and last 4 characters only
    const redactAddress = (addr: string) =>
      `${addr.slice(0, 6)}...${addr.slice(-4)}`;
    console.log('[DEV MODE] Would have sent referral registration request:', {
      url: `${POINTS_API_BASE_URL}/referrals/refer`,
      method: 'POST',
      body: {
        referee: redactAddress(referee),
        referrer: redactAddress(referrer),
      },
    });
    // Simulate a successful response for testing
    return { success: true, status: 200 };
  }

  try {
    const response = await makeApiRequest('/referrals/refer', {
      referee,
      referrer,
    });

    if (response.success) {
      return { success: true, status: 200 };
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
