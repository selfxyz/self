// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import { v4 } from 'uuid';

import { SelfAppBuilder } from '@selfxyz/common/utils/appType';

import { getOrGeneratePointsAddress } from '@/providers/authProvider';

const POINTS_API_BASE_URL =
  'https://points-backend-1025466915061.us-central1.run.app';

export type IncomingPoints = {
  amount: number;
  expectedDate: Date;
};

export type PointEvent = {
  id: string;
  title: string;
  type: PointEventType;
  timestamp: number;
  points: number;
};

export type PointEventType = 'refer' | 'notification' | 'backup' | 'disclosure';

export const POINT_VALUES = {
  disclosure: 10,
  notification: 20,
  backup: 100,
  referrer: 80,
  referee: 24,
} as const;

export const formatTimeUntilDate = (targetDate: Date): string => {
  const now = new Date();
  const diffMs = targetDate.getTime() - now.getTime();
  const diffHours = diffMs / (1000 * 60 * 60);
  const diffDays = diffHours / 24;

  if (diffDays >= 1) {
    const days = Math.ceil(diffDays);
    return `${days} ${days === 1 ? 'day' : 'days'}`;
  } else {
    const hours = Math.ceil(diffHours);
    return `${hours} ${hours === 1 ? 'hour' : 'hours'}`;
  }
};

export const getAllPointEvents = async (): Promise<PointEvent[]> => {
  const [disclosures, notifications, backups, referrals] = await Promise.all([
    getDisclosurePointEvents(),
    getPushNotificationPointEvents(),
    getBackupPointEvents(),
    getReferralPointEvents(),
  ]);
  return [...disclosures, ...notifications, ...backups, ...referrals].sort(
    (a, b) => b.timestamp - a.timestamp,
  );
};

export const getBackupPointEvents = async (): Promise<PointEvent[]> => {
  try {
    const { usePointEventStore } = await import('@/stores/pointEventStore');
    const events = usePointEventStore.getState().events;
    return events.filter(event => event.type === 'backup');
  } catch (error) {
    console.error('Error loading backup point events:', error);
    return [];
  }
};

export const getDisclosurePointEvents = async (): Promise<PointEvent[]> => {
  try {
    const { usePointEventStore } = await import('@/stores/pointEventStore');
    const events = usePointEventStore.getState().events;
    return events.filter(event => event.type === 'disclosure');
  } catch (error) {
    console.error('Error loading disclosure point events:', error);
    return [];
  }
};

export const getIncomingPoints = async (): Promise<IncomingPoints | null> => {
  try {
    const userAddress = await getPointsAddress();
    const nextSundayDate = getNextSundayNoonUTC();

    const response = await fetch(
      `${POINTS_API_BASE_URL}/points/${userAddress.toLowerCase()}`,
    );
    console.log('response points api', response);

    if (!response.ok) {
      return null;
    }

    const data = await response.json();

    if (!data.points || data.points <= 0) {
      return null;
    }

    return {
      amount: data.points,
      expectedDate: nextSundayDate,
    };
  } catch (error) {
    console.error('Error fetching incoming points:', error);
    return null;
  }
};

export const getNextSundayNoonUTC = (): Date => {
  const now = new Date();
  const nextSunday = new Date(now);

  // Get current day (0 = Sunday, 1 = Monday, ..., 6 = Saturday)
  const currentDay = now.getUTCDay();

  // Calculate days until next Sunday (0 = this Sunday if before noon, otherwise next Sunday)
  let daysUntilSunday = 7 - currentDay;

  // If it's already Sunday, check if it's before or after noon UTC
  if (currentDay === 0) {
    const currentHourUTC = now.getUTCHours();
    // If it's already past noon UTC on Sunday, go to next Sunday
    if (currentHourUTC >= 12) {
      daysUntilSunday = 7;
    } else {
      // It's before noon on Sunday, so target is today at noon
      daysUntilSunday = 0;
    }
  }

  nextSunday.setUTCDate(now.getUTCDate() + daysUntilSunday);
  nextSunday.setUTCHours(12, 0, 0, 0);
  return nextSunday;
};

export const getPointsAddress = async (): Promise<string> => {
  return getOrGeneratePointsAddress();
};

export const getPushNotificationPointEvents = async (): Promise<
  PointEvent[]
> => {
  try {
    const { usePointEventStore } = await import('@/stores/pointEventStore');
    const events = usePointEventStore.getState().events;
    return events.filter(event => event.type === 'notification');
  } catch (error) {
    console.error('Error loading notification point events:', error);
    return [];
  }
};

export const getReferralPointEvents = async (): Promise<PointEvent[]> => {
  try {
    const { usePointEventStore } = await import('@/stores/pointEventStore');
    const events = usePointEventStore.getState().events;
    return events.filter(event => event.type === 'refer');
  } catch (error) {
    console.error('Error loading referral point events:', error);
    return [];
  }
};

export const getTotalPoints = async (address: string): Promise<number> => {
  try {
    const url = `${POINTS_API_BASE_URL}/distribution/${address.toLowerCase()}`;
    console.log('url', url);
    const response = await fetch(url);
    console.log('response', response);

    if (!response.ok) {
      return 0;
    }

    const data = await response.json();
    return data.total_points || 0;
  } catch (error) {
    console.error('Error fetching total points:', error);
    return 0;
  }
};

export const getWhiteListedDisclosureAddresses = async (): Promise<
  string[]
> => {
  return [];
};

export const hasUserAnIdentityDocumentRegistered =
  async (): Promise<boolean> => {
    try {
      const { loadDocumentCatalogDirectlyFromKeychain } = await import(
        '@/providers/passportDataProvider'
      );
      const catalog = await loadDocumentCatalogDirectlyFromKeychain();

      return catalog.documents.some(doc => doc.isRegistered === true);
    } catch (error) {
      console.warn(
        'Error checking if user has identity document registered:',
        error,
      );
      return false;
    }
  };

export const hasUserDoneThePointsDisclosure = async (): Promise<boolean> => {
  try {
    const userAddress = await getPointsAddress();
    const response = await fetch(
      `${POINTS_API_BASE_URL}/has-disclosed/${userAddress.toLowerCase()}`,
    );

    if (!response.ok) {
      return false;
    }

    const data = await response.json();
    return data.has_disclosed || false;
  } catch (error) {
    console.error('Error checking disclosure status:', error);
    return false;
  }
};

export const pointsSelfApp = async () => {
  const userAddress = (await getPointsAddress())?.toLowerCase();
  const endpoint = '0x25604DB4E556ad5C3f6e888eCe84EcBb8af28560';
  const builder = new SelfAppBuilder({
    appName: '✨ Self Points',
    endpoint: endpoint.toLowerCase(),
    endpointType: 'celo',
    scope: 'self-workshop',
    userId: v4(),
    userIdType: 'uuid',
    disclosures: {},
    logoBase64:
      'https://storage.googleapis.com/self-logo-reverse/Self%20Logomark%20Reverse.png',
    deeplinkCallback: 'https://self.xyz',
    selfDefinedData: userAddress,
    header: '',
  });

  return builder.build();
};

export const recordBackupPointEvent = async (): Promise<{
  success: boolean;
  error?: string;
}> => {
  try {
    const { usePointEventStore } = await import('@/stores/pointEventStore');
    const userAddress = await getPointsAddress();

    const response = await registerBackupPoints(userAddress);

    if (response.success && response.status === 200) {
      await usePointEventStore
        .getState()
        .addEvent('Secret backed up', 'backup', POINT_VALUES.backup);
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

export const recordNotificationPointEvent = async (): Promise<{
  success: boolean;
  error?: string;
}> => {
  try {
    const { usePointEventStore } = await import('@/stores/pointEventStore');
    const userAddress = await getPointsAddress();

    const response = await registerNotificationPoints(userAddress);

    if (response.success && response.status === 200) {
      await usePointEventStore
        .getState()
        .addEvent(
          'Push notifications enabled',
          'notification',
          POINT_VALUES.notification,
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

export const registerBackupPoints = async (
  userAddress: string,
): Promise<{ success: boolean; status: number; error?: string }> => {
  try {
    const response = await fetch(`${POINTS_API_BASE_URL}/verify-action`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'secret_backup',
        address: userAddress.toLowerCase(),
      }),
    });
    console.log('response verify action backup', response);

    if (response.status === 200) {
      return { success: true, status: 200 };
    }

    const data = await response.json();
    const errorMessages: Record<string, string> = {
      already_verified:
        'You have already backed up your secret for this account.',
      unknown_action: 'Invalid action type. Please try again.',
      verification_failed: 'Verification failed. Please try again.',
      invalid_address: 'Invalid wallet address. Please check your account.',
    };

    const errorMessage =
      errorMessages[data.status] ||
      data.message ||
      'Failed to verify backup. Please try again.';

    return { success: false, status: response.status, error: errorMessage };
  } catch (error) {
    console.error('Error registering backup points:', error);
    return {
      success: false,
      status: 500,
      error: 'Network error. Please check your connection and try again.',
    };
  }
};

export const registerNotificationPoints = async (
  userAddress: string,
): Promise<{ success: boolean; status: number; error?: string }> => {
  try {
    const response = await fetch(`${POINTS_API_BASE_URL}/verify-action`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'push_notification',
        address: userAddress.toLowerCase(),
      }),
    });

    if (response.status === 200) {
      return { success: true, status: 200 };
    }

    const data = await response.json();
    const errorMessages: Record<string, string> = {
      already_verified:
        'You have already verified push notifications for this account.',
      unknown_action: 'Invalid action type. Please try again.',
      verification_failed:
        'Verification failed. Please ensure you have enabled push notifications.',
      invalid_address: 'Invalid wallet address. Please check your account.',
    };

    const errorMessage =
      errorMessages[data.status] ||
      data.message ||
      'Failed to verify push notification. Please try again.';

    return { success: false, status: response.status, error: errorMessage };
  } catch (error) {
    console.error('Error registering notification points:', error);
    return {
      success: false,
      status: 500,
      error: 'Network error. Please check your connection and try again.',
    };
  }
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
  try {
    const response = await fetch(`${POINTS_API_BASE_URL}/referrals/refer`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        referee: referee.toLowerCase(),
        referrer: referrer.toLowerCase(),
      }),
    });

    if (response.status === 200) {
      // Expecting "ok" response on success
      return { success: true, status: 200 };
    }

    // Capture error details for known error scenarios
    let errorMessage =
      'Failed to register referral relationship. Please try again.';
    try {
      const data = await response.json();
      // Map some common errors, improve this as backend error responses are updated
      // For now, backend returns "message" or similar on error
      if (data && typeof data.message === 'string') {
        errorMessage = data.message;
      }
    } catch (jsonParseError) {
      // If parsing fails, just keep the generic error
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
