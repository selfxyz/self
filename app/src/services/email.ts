// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import { Linking, Platform } from 'react-native';
import { getCountry, getLocales, getTimeZone } from 'react-native-localize';

import { sanitizeErrorMessage } from '@selfxyz/mobile-sdk-alpha/utils/utils';

import { version } from '../../package.json';

interface SendFeedbackEmailOptions {
  message: string;
  origin: string;
  subject?: string;
  recipient?: string;
}

/**
 * Sends a notification email requesting support for a specific country
 * @param options Configuration for the country support notification email
 */
export const sendCountrySupportNotification = async ({
  countryName,
  countryCode,
  documentCategory,
  subject = `Country Support Request: ${countryName}`,
  recipient = 'support@self.xyz',
}: SendCountrySupportNotificationOptions): Promise<void> => {
  const deviceInfo = [
    ['device', `${Platform.OS}@${Platform.Version}`],
    ['app', `v${version}`],
    [
      'locales',
      getLocales()
        .map(locale => `${locale.languageCode}-${locale.countryCode}`)
        .join(','),
    ],
    ['userCountry', getCountry()],
    ['requestedCountry', countryCode || 'Unknown'],
    ['documentCategory', documentCategory || 'Unknown'],
    ['tz', getTimeZone()],
    ['ts', new Date().toISOString()],
    ['origin', 'coming_soon_screen'],
  ] as [string, string][];

  const documentTypeText =
    documentCategory === 'id_card'
      ? 'ID cards'
      : documentCategory === 'passport'
        ? 'passports'
        : 'documents';

  const body = `Hi SELF Team,

I would like to request support for ${countryName} ${documentTypeText} in the SELF app. Please notify me when support becomes available.

Additional comments (optional):


---
Technical Details (do not modify):
${deviceInfo.map(([k, v]) => `${k}=${v}`).join('\n')}
---`;

  await Linking.openURL(
    `mailto:${recipient}?subject=${encodeURIComponent(
      subject,
    )}&body=${encodeURIComponent(body)}`,
  );
};

interface SendCountrySupportNotificationOptions {
  countryName: string;
  countryCode?: string;
  documentCategory?: string;
  subject?: string;
  recipient?: string;
}

/**
 * Sends a feedback email with device information and user message
 * @param options Configuration for the feedback email
 */
export const sendFeedbackEmail = async ({
  message,
  origin,
  subject = 'SELF App Feedback',
  recipient = 'support@self.xyz',
}: SendFeedbackEmailOptions): Promise<void> => {
  const deviceInfo = [
    ['device', `${Platform.OS}@${Platform.Version}`],
    ['app', `v${version}`],
    [
      'locales',
      getLocales()
        .map(locale => `${locale.languageCode}-${locale.countryCode}`)
        .join(','),
    ],
    ['country', getCountry()],
    ['tz', getTimeZone()],
    ['ts', new Date().toISOString()],
    ['origin', origin],
    ['error', sanitizeErrorMessage(message)],
  ] as [string, string][];

  const body = `Please describe the issue you're experiencing:

---
Technical Details (do not modify):
${deviceInfo.map(([k, v]) => `${k}=${v}`).join('\n')}
---`;

  await Linking.openURL(
    `mailto:${recipient}?subject=${encodeURIComponent(
      subject,
    )}&body=${encodeURIComponent(body)}`,
  );
};
