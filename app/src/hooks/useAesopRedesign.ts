// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import { IS_TEST_BUILD } from '@env';

export const shouldShowAesopRedesign = (): boolean => {
  return typeof IS_TEST_BUILD === 'boolean'
    ? IS_TEST_BUILD
    : typeof IS_TEST_BUILD === 'string' && IS_TEST_BUILD === 'true';
};

export const useAesopRedesign = (): boolean => {
  return shouldShowAesopRedesign();
};
