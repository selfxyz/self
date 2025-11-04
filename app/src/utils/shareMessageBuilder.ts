// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

export interface ReferralMessageResult {
  message: string;
  link: string;
}

/**
 * Builds a referral message and link from the provided referral code.
 *
 * @param referralCode - The referral code to use for building the link
 * @returns An object containing the formatted message and referral link
 */
export const buildReferralMessage = (
  referralCode: string,
): ReferralMessageResult => {
  const referralLink = referralCode
    ? `https://self.app/r/${referralCode}`
    : 'https://self.app/r/YOUR_REFERRAL_CODE';

  const message = `Join Self and use my referral link: ${referralLink}`;

  return { message, link: referralLink };
};
