import test from 'node:test';
import assert from 'node:assert';
import { SelfBackendVerifier } from '../src/SelfBackendVerifier.js';
import { AttestationId } from '../src/types/types.js';

const configStorage = {
  getConfig: async () => ({ olderThan: 18, excludedCountries: [], ofac: false }),
  getActionId: async () => 'test',
  setConfig: async () => false,
};

const construct = () =>
  new SelfBackendVerifier(
    'test-scope',
    'https://example.com/api/verify',
    true,
    new Map<AttestationId, boolean>([[1, true]]),
    configStorage,
    'uuid'
  );

test('constructor warns about deprecation exactly once per process', () => {
  const warnings: string[] = [];
  const originalWarn = console.warn;
  console.warn = (...args: unknown[]) => {
    warnings.push(args.map(String).join(' '));
  };
  try {
    construct();
    construct();
  } finally {
    console.warn = originalWarn;
  }

  const deprecationWarnings = warnings.filter((w) => w.includes('deprecated'));
  assert.equal(deprecationWarnings.length, 1);
  assert.ok(deprecationWarnings[0].includes('@selfxyz/enterprise-sdk'));
  assert.ok(
    deprecationWarnings[0].includes(
      'https://docs.self.xyz/docs/self-enterprise/migration/from-self-pass-sdk/'
    )
  );
});
