// SPDX-License-Identifier: BUSL-1.1; Copyright (c) 2025 Social Connect Labs, Inc.; Licensed under BUSL-1.1 (see LICENSE); Apache-2.0 from 2029-06-11

import { Linking, Platform } from 'react-native';
import { getCountry, getLocales, getTimeZone } from 'react-native-localize';

import { sanitizeErrorMessage } from '@/utils/utils';

import { version } from '../../package.json';

interface SendFeedbackEmailOptions {
  message: string;
  origin: string;
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
  recipient = 'team@self.xyz',
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
