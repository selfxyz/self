// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import type { Config } from '../types/public';

type BaseConfig = Omit<Required<Config>, 'devConfig'> & Pick<Config, 'devConfig'>;

export function mergeConfig(base: BaseConfig, override: Config): BaseConfig {
  return {
    ...base,
    ...override,
    timeouts: { ...base.timeouts, ...(override.timeouts ?? {}) },
    features: { ...base.features, ...(override.features ?? {}) },
    devConfig: override.devConfig ?? base.devConfig,
  };
}
