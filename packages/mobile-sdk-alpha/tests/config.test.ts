import { describe, expect, it } from 'vitest';

import { mergeConfig } from '../src/config/merge';
import type { Config } from '../src/types/public';

describe('mergeConfig', () => {
  const baseConfig: Required<Config> = {
    endpoints: {
      api: 'https://api.example.com',
      teeWs: 'wss://ws.example.com',
    },
    timeouts: {
      scanMs: 30000,
      proofMs: 60000,
    },
    features: {
      nfc: true,
      mrz: true,
    },
    tlsPinning: {
      enabled: true,
      pins: ['cert1', 'cert2'],
    },
  };

  // Freeze base config to catch accidental mutations inside mergeConfig
  Object.freeze(baseConfig.tlsPinning.pins);
  Object.freeze(baseConfig.tlsPinning);
  Object.freeze(baseConfig.features);
  Object.freeze(baseConfig.timeouts);
  Object.freeze(baseConfig.endpoints);
  Object.freeze(baseConfig);

  it('merges complete override config correctly', () => {
    const override: Config = {
      endpoints: {
        api: 'https://new-api.example.com',
      },
      timeouts: {
        scanMs: 45000,
      },
      features: {
        nfc: false,
      },
      tlsPinning: {
        enabled: false,
      },
    };

    const result = mergeConfig(baseConfig, override);

    expect(result.endpoints.api).toBe('https://new-api.example.com');
    expect(result.endpoints.teeWs).toBe('wss://ws.example.com'); // from base
    expect(result.timeouts.scanMs).toBe(45000);
    expect(result.timeouts.proofMs).toBe(60000); // from base
    expect(result.features.nfc).toBe(false);
    expect(result.features.mrz).toBe(true); // from base
    expect(result.tlsPinning.enabled).toBe(false);
    expect(result.tlsPinning.pins).toEqual(['cert1', 'cert2']); // from base
  });

  it('handles undefined nested objects gracefully', () => {
    const override: Config = {
      // endpoints: undefined
      timeouts: undefined,
      features: undefined,
      tlsPinning: undefined,
    };

    const result = mergeConfig(baseConfig, override);

    // Should use base config values when override is undefined
    expect(result.endpoints.api).toBe('https://api.example.com');
    expect(result.endpoints.teeWs).toBe('wss://ws.example.com');
    expect(result.timeouts.scanMs).toBe(30000);
    expect(result.timeouts.proofMs).toBe(60000);
    expect(result.features.nfc).toBe(true);
    expect(result.features.mrz).toBe(true);
    expect(result.tlsPinning.enabled).toBe(true);
    expect(result.tlsPinning.pins).toEqual(['cert1', 'cert2']);
  });

  it('handles partial nested objects', () => {
    const override: Config = {
      endpoints: {
        api: 'https://partial.example.com',
        // ws: undefined
      },
      timeouts: {
        scanMs: 15000,
        // proofMs: undefined
      },
      features: {
        nfc: false,
        // mrz: undefined
      },
      tlsPinning: {
        enabled: false,
        // certs: undefined
      },
    };

    const result = mergeConfig(baseConfig, override);

    expect(result.endpoints.api).toBe('https://partial.example.com');
    expect(result.endpoints.teeWs).toBe('wss://ws.example.com'); // from base
    expect(result.timeouts.scanMs).toBe(15000);
    expect(result.timeouts.proofMs).toBe(60000); // from base
    expect(result.features.nfc).toBe(false);
    expect(result.features.mrz).toBe(true); // from base
    expect(result.tlsPinning.enabled).toBe(false);
    expect(result.tlsPinning.pins).toEqual(['cert1', 'cert2']); // from base
  });

  it('handles empty override config', () => {
    const override: Config = {};

    const result = mergeConfig(baseConfig, override);

    // Should return base config unchanged
    expect(result).toEqual(baseConfig);
  });

  it('handles mixed undefined and defined properties', () => {
    const override: Config = {
      endpoints: undefined,
      timeouts: {
        scanMs: 20000,
      },
      features: undefined,
      tlsPinning: {
        enabled: true,
        pins: ['new-cert'],
      },
    };

    const result = mergeConfig(baseConfig, override);

    expect(result.endpoints.api).toBe('https://api.example.com'); // from base
    expect(result.endpoints.teeWs).toBe('wss://ws.example.com'); // from base
    expect(result.timeouts.scanMs).toBe(20000);
    expect(result.timeouts.proofMs).toBe(60000); // from base
    expect(result.features.nfc).toBe(true); // from base
    expect(result.features.mrz).toBe(true); // from base
    expect(result.tlsPinning.enabled).toBe(true); // from base
    expect(result.tlsPinning.pins).toEqual(['new-cert']);
  });
});
