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
