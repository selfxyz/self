// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import type { Config } from '../types/public';

const detectDefaultPlatform = (): string => {
  if (typeof navigator === 'undefined') {
    return 'unknown';
  }

  const userAgent = navigator.userAgent.toLowerCase();

  if (/iphone|ipad|ipod/.test(userAgent)) {
    return 'ios';
  }

  if (/android/.test(userAgent)) {
    return 'android';
  }

  return 'web';
};

export const defaultConfig: Omit<Required<Config>, 'devConfig'> & Pick<Config, 'devConfig'> = {
  timeouts: { scanMs: 60000 },
  // in future this can be used to enable/disable experimental features
  features: {},
  platform: detectDefaultPlatform(),
  debug: false,
};
