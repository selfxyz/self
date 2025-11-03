// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import { v4 } from 'uuid';

import { SelfAppBuilder } from '@selfxyz/common/utils/appType';

export type PointEvent = {
  id: string;
  title: string;
  type: PointEventType;
  timestamp: number;
  points: number;
};

export type PointEventType = 'refer' | 'notification' | 'backup' | 'disclosure';

// shoudl probably replace that with an api call
export const POINT_VALUES = {
  disclosure: 10,
  notification: 20,
  backup: 100,
  refer: 150,
} as const;

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

// Mock function to get backup point events
export const getBackupPointEvents = async (): Promise<PointEvent[]> => {
  // TODO: replace with actual settingStore query
  // This should check hasViewedRecoveryPhrase or cloudBackupEnabled from settingStore
  return [
    {
      id: 'backup-1',
      title: 'Account backup completed',
      type: 'backup',
      timestamp: Date.now() - 1000 * 60 * 60 * 24 * 7, // 7 days ago
      points: POINT_VALUES.backup,
    },
  ];
};

// Mock function to get disclosure point events
// In the future, this will query on-chain events and match with whitelisted addresses
export const getDisclosurePointEvents = async (): Promise<PointEvent[]> => {
  // TODO: replace with actual query to self points contract
  // This should fetch disclosure events from proof history that match whitelisted addresses
  return [
    {
      id: 'disclosure-1',
      title: 'Disclosure to WorldCoin',
      type: 'disclosure',
      timestamp: Date.now() - 1000 * 60 * 60 * 2, // 2 hours ago
      points: POINT_VALUES.disclosure,
    },
    {
      id: 'disclosure-2',
      title: 'Disclosure to Coinbase',
      type: 'disclosure',
      timestamp: Date.now() - 1000 * 60 * 60 * 24 * 3, // 3 days ago
      points: POINT_VALUES.disclosure,
    },
  ];
};

// Mock function to get push notification point events
export const getPushNotificationPointEvents = async (): Promise<
  PointEvent[]
> => {
  // TODO: replace with actual backend query
  // This should fetch from settingStore or backend tracking
  return [
    {
      id: 'notification-1',
      title: 'Push notifications enabled',
      type: 'notification',
      timestamp: Date.now() - 1000 * 60 * 60 * 24 * 5, // 5 days ago
      points: POINT_VALUES.notification,
    },
  ];
};

// Mock function to get referral point events
export const getReferralPointEvents = async (): Promise<PointEvent[]> => {
  // TODO: replace with actual backend/contract query
  // This should fetch referral events from backend or on-chain
  return [
    {
      id: 'referral-1',
      title: 'Friend joined via referral',
      type: 'refer',
      timestamp: Date.now() - 1000 * 60 * 60 * 24 * 10, // 10 days ago
      points: POINT_VALUES.refer,
    },
  ];
};

export const getTotalPoints = (_address: string): number => {
  // TODO: replace with the view function call of the self points contract
  return 312;
};

export const getUserAddress = async (): Promise<string> => {
  return '0x0000000000000000000000000000000000000000';
};

export const getWhiteListedDisclosureAddresses = async (): Promise<
  string[]
> => {
  // TODO: replace with the view function call of the self points contract
  return [];
};

// push notication flow
// enable the push notification
// send an api call
// store in redis: user address -> fcm, code
// backend will generate a 6 digit code and store it in redis
// send the push notification to the user with the code
// if users sends back the code, the backend will check if the code is correct and transfer the points
// countdown of 20 seconds before the code expires and users can click
// after the 20sec, user is allowed get a new push notification with a new code
/**
 * Checks if the user has at least one registered identity document
 * by looking at the document catalog's isRegistered field
 */
export const hasUserAnIdentityDocumentRegistered =
  async (): Promise<boolean> => {
    try {
      // Dynamic import to avoid circular dependencies
      const { loadDocumentCatalogDirectlyFromKeychain } = await import(
        '@/providers/passportDataProvider'
      );
      const catalog = await loadDocumentCatalogDirectlyFromKeychain();

      // Check if any document is registered
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
  return true;
};

export const pointsSelfApp = async () => {
  const userAddress = (await getUserAddress())?.toLowerCase();
  const endpoint = '0x25604DB4E556ad5C3f6e888eCe84EcBb8af28560';
  const builder = new SelfAppBuilder({
    appName: '✨ Self Points',
    endpoint,
    endpointType: 'celo',
    scope: 'self-workshop',
    userId: v4(), // random UUID as the api is asking for one. we should make this optional.
    userIdType: 'uuid',
    disclosures: {},
    logoBase64:
      'https://storage.googleapis.com/self-logo-reverse/Self%20Logomark%20Reverse.png',
    deeplinkCallback: '',
    selfDefinedData: userAddress,
    header: '',
    devMode: true,
  });

  return builder.build();
};
