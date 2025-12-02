// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

// Re-export all types and constants
export type {
  IncomingPoints,
  PointEvent,
  PointEventType,
} from '@/services/points/types';
export { POINT_VALUES } from '@/services/points/types';

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
} from '@/services/points/utils';

// Re-export event getter functions
export {
  getAllPointEvents,
  getBackupPointEvents,
  getDisclosurePointEvents,
  getPushNotificationPointEvents,
  getReferralPointEvents,
} from '@/services/points/getEvents';

// Re-export event recording functions
export {
  recordBackupPointEvent,
  recordNotificationPointEvent,
  recordReferralPointEvent,
} from '@/services/points/recordEvents';

// Re-export event registration functions
export {
  registerBackupPoints,
  registerNotificationPoints,
  registerReferralPoints,
} from '@/services/points/registerEvents';
