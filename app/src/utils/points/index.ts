// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

// Re-export all types and constants
export type {
  IncomingPoints,
  PointEvent,
  PointEventType,
} from '@/utils/points/types';
export { POINT_VALUES } from '@/utils/points/types';

// Re-export all utility functions
export {
  formatTimeUntilDate,
  getIncomingPoints,
  getNextSundayNoonUTC,
  getPointsAddress,
  getTotalPoints,
  getWhiteListedDisclosureAddresses,
  hasUserAnIdentityDocumentRegistered,
  hasUserDoneThePointsDisclosure,
  pointsSelfApp,
} from '@/utils/points/utils';

// Re-export event getter functions
export {
  getAllPointEvents,
  getBackupPointEvents,
  getDisclosurePointEvents,
  getPushNotificationPointEvents,
  getReferralPointEvents,
} from '@/utils/points/getEvents';

// Re-export event recording functions
export {
  recordBackupPointEvent,
  recordNotificationPointEvent,
  recordReferralPointEvent,
} from '@/utils/points/recordEvents';

// Re-export event registration functions
export {
  registerBackupPoints,
  registerNotificationPoints,
  registerReferralPoints,
} from '@/utils/points/registerEvents';
