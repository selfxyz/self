// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
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
  const logoSource = useMemo(() => {
    if (!selfApp?.logoBase64) {
      return null;
    }

    // Check if the logo is already a URL
    if (
      selfApp.logoBase64.startsWith('http://') ||
      selfApp.logoBase64.startsWith('https://')
    ) {
      return { uri: selfApp.logoBase64 };
    }

    // Otherwise handle as base64
    const base64String = selfApp.logoBase64.startsWith('data:image')
      ? selfApp.logoBase64
      : `data:image/png;base64,${selfApp.logoBase64}`;
    return { uri: base64String };
  }, [selfApp?.logoBase64]);

  const url = useMemo(() => {
    if (!selfApp?.endpoint) {
      return null;
    }
    return formatEndpoint(selfApp.endpoint);
  }, [selfApp?.endpoint]);

  const formattedUserId = useMemo(
    () => formatUserId(selfApp?.userId, selfApp?.userIdType),
    [selfApp?.userId, selfApp?.userIdType],
  );

  const disclosureItems = useMemo(() => {
    const disclosures = (selfApp?.disclosures as SelfAppDisclosureConfig) || {};
    return getDisclosureItems(disclosures);
  }, [selfApp?.disclosures]);

  return {
    logoSource,
    url,
    formattedUserId,
    disclosureItems,
  };
}
