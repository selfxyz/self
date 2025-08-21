// SPDX-License-Identifier: BUSL-1.1; Copyright (c) 2025 Social Connect Labs, Inc.; Licensed under BUSL-1.1 (see LICENSE); Apache-2.0 from 2029-06-11

import { IS_TEST_BUILD } from '@env';

export const shouldShowAesopRedesign = (): boolean => {
  return typeof IS_TEST_BUILD === 'boolean'
    ? IS_TEST_BUILD
    : typeof IS_TEST_BUILD === 'string' && IS_TEST_BUILD === 'true';
};

export const useAesopRedesign = (): boolean => {
  return shouldShowAesopRedesign();
};
