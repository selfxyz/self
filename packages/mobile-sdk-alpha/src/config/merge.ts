// SPDX-License-Identifier: BUSL-1.1; Copyright (c) 2025 Social Connect Labs, Inc.; Licensed under BUSL-1.1 (see LICENSE); Apache-2.0 from 2029-06-11

import type { Config } from '../types/public';

export function mergeConfig(base: Required<Config>, override: Config): Required<Config> {
  return {
    ...base,
    ...override,
    endpoints: { ...base.endpoints, ...(override.endpoints ?? {}) },
    timeouts: { ...base.timeouts, ...(override.timeouts ?? {}) },
    features: { ...base.features, ...(override.features ?? {}) },
    tlsPinning: { ...base.tlsPinning, ...(override.tlsPinning ?? {}) },
  };
}
