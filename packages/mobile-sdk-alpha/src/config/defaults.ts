// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import type { Config } from '../types/public';

export const defaultConfig: Required<Config> = {
  timeouts: { scanMs: 60000 },
  // in future this can be used to enable/disable experimental features
  features: {},
};
