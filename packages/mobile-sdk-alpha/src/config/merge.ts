import type { Config } from '../types/public';

/**
 * Merge a base configuration with override values.
 *
 * Nested objects such as `endpoints`, `timeouts`, `features` and `tlsPinning`
 * are merged shallowly, giving precedence to values in the override object.
 *
 * @param base - Fully populated default configuration.
 * @param override - Partial configuration supplied by the consumer.
 */
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
