// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import { v4 } from 'uuid';

import { SelfAppBuilder } from '@selfxyz/common/utils/appType';

import { selfLogoReverseUrl } from '@/consts/links';
import { getOrGeneratePointsAddress } from '@/providers/authProvider';
import {
  POINTS_API_BASE_URL,
  POINTS_API_ROUTES,
  POINTS_SELF_APP_ENDPOINT,
  POINTS_SELF_APP_NAME,
  POINTS_SELF_APP_SCOPE,
} from '@/services/points/constants';
import type { IncomingPoints } from '@/services/points/types';

export type WhitelistedContract = {
  contract_address: string;
  points_per_disclosure: number;
  num_disclosures: number;
};

export const NULLIFIER_ALREADY_USED_ERROR_PREFIX = '0xdc215c0a';

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

export const getIncomingPoints = async (): Promise<IncomingPoints | null> => {
  try {
    const userAddress = await getPointsAddress();
    const nextSundayDate = getNextSundayNoonUTC();

    const response = await fetch(
      `${POINTS_API_BASE_URL}${POINTS_API_ROUTES.pointsByAddress(userAddress)}`,
    );

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

export const getTotalPoints = async (address: string): Promise<number> => {
  try {
    const url = `${POINTS_API_BASE_URL}${POINTS_API_ROUTES.pointsByAddress(address)}`;
    const response = await fetch(url);

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
  WhitelistedContract[]
> => {
  try {
    const response = await fetch(
      `${POINTS_API_BASE_URL}${POINTS_API_ROUTES.whitelistedAddresses}`,
    );

    if (!response.ok) {
      return [];
    }

    const data = await response.json();
    return data.contracts || [];
  } catch (error) {
    console.error('Error fetching whitelisted addresses:', error);
    return [];
  }
};

export const hasUserAnIdentityDocumentRegistered =
  async (): Promise<boolean> => {
    try {
      const { loadDocumentCatalogDirectlyFromKeychain } =
        await import('@/providers/passportDataProvider');
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
      `${POINTS_API_BASE_URL}${POINTS_API_ROUTES.hasDisclosedByAddress(
        userAddress,
      )}`,
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
  const builder = new SelfAppBuilder({
    appName: POINTS_SELF_APP_NAME,
    endpoint: POINTS_SELF_APP_ENDPOINT.toLowerCase(),
    endpointType: 'celo',
    scope: POINTS_SELF_APP_SCOPE,
    userId: v4(),
    userIdType: 'uuid',
    disclosures: {},
    logoBase64: selfLogoReverseUrl,
    header: '',
  });

  return builder.build();
};
