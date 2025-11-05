// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import type { DocumentCategory } from '@selfxyz/common/types';

export type SharedRoutesParamList = {
  ComingSoon: {
    countryCode?: string;
    documentCategory?: DocumentCategory;
  };
  WebView: {
    url: string;
    title?: string;
    shareTitle?: string;
    shareMessage?: string;
    shareUrl?: string;
  };
};
