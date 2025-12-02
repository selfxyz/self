// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import { useEffect, useMemo, useState } from 'react';

import { referralBaseUrl } from '@/consts/links';
import { getOrGeneratePointsAddress } from '@/providers/authProvider';
import { useSettingStore } from '@/stores/settingStore';

interface ReferralMessageResult {
  message: string;
  referralLink: string;
}

const buildReferralMessageFromAddress = (
  userPointsAddress: string,
): ReferralMessageResult => {
  const referralLink = `${referralBaseUrl}/referral/${userPointsAddress}`;
  return {
    message: `Join Self and use my referral link:\n\n${referralLink}`,
    referralLink,
  };
};

export const useReferralMessage = () => {
  const pointsAddress = useSettingStore(state => state.pointsAddress);
  const [fetchedAddress, setFetchedAddress] = useState<string | null>(null);

  // Use store address if available, otherwise use fetched address
  const address = pointsAddress ?? fetchedAddress;

  // Compute message synchronously when address is available
  const result = useMemo(
    () => (address ? buildReferralMessageFromAddress(address) : null),
    [address],
  );

  useEffect(() => {
    if (!pointsAddress) {
      // Only fetch if not already in store
      const loadReferralData = async () => {
        const fetchedAddr = await getOrGeneratePointsAddress();
        setFetchedAddress(fetchedAddr);
      };

      loadReferralData();
    }
  }, [pointsAddress]);

  return useMemo(
    () => ({
      message: result?.message ?? '',
      referralLink: result?.referralLink ?? '',
      isLoading: !result,
    }),
    [result],
  );
};
