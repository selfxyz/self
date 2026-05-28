// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import { useMemo } from 'react';

import type { SelfApp } from '@selfxyz/common';
import type { SelfAppDisclosureConfig } from '@selfxyz/common/utils/appType';
import { formatEndpoint } from '@selfxyz/common/utils/scope';

import { getDisclosureItems } from '@/utils/disclosureUtils';
import { formatUserId } from '@/utils/formatUserId';

/**
 * Hook that extracts and transforms SelfApp data for use in UI components.
 * Returns memoized values for logo source, URL, formatted user ID, and disclosure items.
 */
export function useSelfAppData(selfApp: SelfApp | null) {
  const logoBase64 = selfApp?.logoBase64;
  const endpoint = selfApp?.endpoint;
  const userId = selfApp?.userId;
  const userIdType = selfApp?.userIdType;
  const disclosures = selfApp?.disclosures as SelfAppDisclosureConfig;

  const logoSource = useMemo(() => {
    if (!logoBase64) {
      return null;
    }

    // Check if the logo is already a URL
    if (logoBase64.startsWith('http://') || logoBase64.startsWith('https://')) {
      return { uri: logoBase64 };
    }

    // Otherwise handle as base64
    const base64String = logoBase64.startsWith('data:image')
      ? logoBase64
      : `data:image/png;base64,${logoBase64}`;
    return { uri: base64String };
  }, [logoBase64]);

  const url = useMemo(() => {
    if (!endpoint) {
      return null;
    }
    return formatEndpoint(endpoint);
  }, [endpoint]);

  const formattedUserId = useMemo(
    () => formatUserId(userId, userIdType),
    [userId, userIdType],
  );

  const disclosureItems = useMemo(() => {
    return getDisclosureItems(disclosures || {});
  }, [disclosures]);

  return {
    logoSource,
    url,
    formattedUserId,
    disclosureItems,
  };
}
