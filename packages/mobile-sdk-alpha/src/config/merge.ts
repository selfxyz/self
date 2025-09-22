// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import type { Config } from '../types/public';

export function mergeConfig(base: Required<Config>, override: Config): Required<Config> {
  return {
    ...base,
    ...override,
    timeouts: { ...base.timeouts, ...(override.timeouts ?? {}) },
    features: { ...base.features, ...(override.features ?? {}) },
  };
}
