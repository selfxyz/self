// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import { describe, expect, it } from 'vitest';

import { mergeConfig } from '../src/config/merge';
import type { Config } from '../src/types/public';

describe('mergeConfig', () => {
  const baseConfig: Required<Config> = {
    timeouts: {
      scanMs: 30000,
    },
    features: {
      nfc: true,
      mrz: true,
    },
  };

  // Freeze base config to catch accidental mutations inside mergeConfig
  Object.freeze(baseConfig.features);
  Object.freeze(baseConfig.timeouts);
  Object.freeze(baseConfig);

  it('merges complete override config correctly', () => {
    const override: Config = {
      timeouts: {
        scanMs: 45000,
      },
      features: {
        nfc: false,
      },
    };

    const result = mergeConfig(baseConfig, override);

    expect(result.timeouts.scanMs).toBe(45000);
    expect(result.features.nfc).toBe(false);
    expect(result.features.mrz).toBe(true); // from base
  });

  it('handles undefined nested objects gracefully', () => {
    const override: Config = {
      timeouts: undefined,
      features: undefined,
    };

    const result = mergeConfig(baseConfig, override);

    // Should use base config values when override is undefined
    expect(result.timeouts.scanMs).toBe(30000);
    expect(result.features.nfc).toBe(true);
    expect(result.features.mrz).toBe(true);
  });

  it('handles partial nested objects', () => {
    const override: Config = {
      timeouts: {
        scanMs: 15000,
      },
      features: {
        nfc: false,
        // mrz: undefined (should inherit from base)
      },
    };

    const result = mergeConfig(baseConfig, override);

    expect(result.timeouts.scanMs).toBe(15000);
    expect(result.features.nfc).toBe(false);
    expect(result.features.mrz).toBe(true); // from base
  });

  it('handles mixed undefined and defined properties', () => {
    const override: Config = {
      // timeouts: deliberately omitted
      features: { mrz: false },
    };

    const result = mergeConfig(baseConfig, override);

    expect(result.timeouts.scanMs).toBe(30000); // from base
    expect(result.features.nfc).toBe(true); // from base
    expect(result.features.mrz).toBe(false);
  });

  it('returns a new object, does not mutate inputs', () => {
    const override: Config = {
      features: { customFeature: true },
    };

    const result = mergeConfig(baseConfig, override);

    expect(result).not.toBe(baseConfig);
    expect(result.features).not.toBe(baseConfig.features);
    expect(baseConfig.features.customFeature).toBeUndefined();
    expect(result.features.customFeature).toBe(true);
  });
});
