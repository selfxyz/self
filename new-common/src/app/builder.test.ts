import { describe, it, expect, vi } from 'vitest';
import { SelfAppBuilder, getUniversalLink } from './builder.js';
import { DISCLOSURE_PRESETS } from './presets.js';

vi.mock('uuid', () => ({ v4: () => 'a1b2c3d4-e5f6-1234-a678-9abcdef01234' }));

describe('SelfAppBuilder', () => {
  const validConfig = {
    appName: 'Test App',
    scope: 'test-scope',
    endpoint: 'https://example.com/verify',
    userId: 'a1b2c3d4-e5f6-1234-a678-9abcdef01234',
  };

  describe('existing behavior', () => {
    it('builds with minimal required fields', () => {
      const app = new SelfAppBuilder(validConfig).build();
      expect(app.appName).toBe('Test App');
      expect(app.scope).toBe('test-scope');
      expect(app.endpoint).toBe('https://example.com/verify');
      expect(app.userId).toBe('a1b2c3d4-e5f6-1234-a678-9abcdef01234');
    });

    it('applies correct defaults', () => {
      const app = new SelfAppBuilder(validConfig).build();
      expect(app.sessionId).toBe('a1b2c3d4-e5f6-1234-a678-9abcdef01234');
      expect(app.userIdType).toBe('uuid');
      expect(app.devMode).toBe(false);
      expect(app.endpointType).toBe('https');
      expect(app.header).toBe('');
      expect(app.logoBase64).toBe('');
      expect(app.deeplinkCallback).toBe('');
      expect(app.disclosures).toEqual({});
      expect(app.chainID).toBe(42220);
      expect(app.version).toBe(2);
      expect(app.userDefinedData).toBe('');
      expect(app.selfDefinedData).toBe('');
    });

    it('sets chainID to 11142220 for staging_celo', () => {
      const app = new SelfAppBuilder({
        ...validConfig,
        endpoint: '0xabcdef1234567890abcdef1234567890abcdef12',
        endpointType: 'staging_celo',
      }).build();
      expect(app.chainID).toBe(11142220);
    });

    it('strips 0x prefix from hex userId', () => {
      const app = new SelfAppBuilder({
        ...validConfig,
        userId: '0xabcdef1234567890abcdef1234567890abcdef12',
        userIdType: 'hex',
      }).build();
      expect(app.userId).toBe('abcdef1234567890abcdef1234567890abcdef12');
    });

    it('allows explicit config to override defaults', () => {
      const app = new SelfAppBuilder({
        ...validConfig,
        devMode: true,
        header: 'Verify Identity',
        logoBase64: 'base64data',
        disclosures: { name: true, ofac: true },
      }).build();
      expect(app.devMode).toBe(true);
      expect(app.header).toBe('Verify Identity');
      expect(app.logoBase64).toBe('base64data');
      expect(app.disclosures).toEqual({ name: true, ofac: true });
    });
  });

  describe('validation errors', () => {
    it('throws when appName is missing', () => {
      expect(() => new SelfAppBuilder({ ...validConfig, appName: '' })).toThrow(
        'appName is required',
      );
    });

    it('throws when scope is missing', () => {
      expect(() => new SelfAppBuilder({ ...validConfig, scope: '' })).toThrow('scope is required');
    });

    it('throws when endpoint is missing', () => {
      expect(() => new SelfAppBuilder({ ...validConfig, endpoint: '' })).toThrow(
        'endpoint is required',
      );
    });

    it('throws when scope contains non-ASCII chars', () => {
      expect(() => new SelfAppBuilder({ ...validConfig, scope: 'sc\u00f6pe' })).toThrow('ASCII');
    });

    it('throws when scope exceeds 31 chars', () => {
      expect(() => new SelfAppBuilder({ ...validConfig, scope: 'a'.repeat(32) })).toThrow(
        '32 characters',
      );
    });

    it('throws for localhost endpoints', () => {
      expect(
        () => new SelfAppBuilder({ ...validConfig, endpoint: 'https://localhost/verify' }),
      ).toThrow('localhost');
    });

    it('throws when https endpoint does not start with https://', () => {
      expect(
        () =>
          new SelfAppBuilder({
            ...validConfig,
            endpointType: 'https',
            endpoint: 'http://example.com',
          }),
      ).toThrow('https://');
    });

    it('throws when celo endpoint does not start with 0x', () => {
      expect(
        () =>
          new SelfAppBuilder({
            ...validConfig,
            endpointType: 'celo',
            endpoint: 'not-an-address',
          }),
      ).toThrow('valid contract address');
    });
  });

  describe('getUniversalLink', () => {
    it('encodes selfApp as URL parameter', () => {
      const app = new SelfAppBuilder(validConfig).build();
      const link = getUniversalLink(app);
      expect(link).toContain('selfApp=');
      const encoded = link.split('selfApp=')[1];
      const decoded = JSON.parse(decodeURIComponent(encoded));
      expect(decoded.appName).toBe('Test App');
    });
  });

  describe('disclosure presets', () => {
    it('basic-kyc includes name, nationality, dob, and ofac', () => {
      expect(DISCLOSURE_PRESETS['basic-kyc']).toEqual({
        name: true,
        nationality: true,
        date_of_birth: true,
        ofac: true,
      });
    });

    it('age-verification includes only minimumAge and dob', () => {
      expect(DISCLOSURE_PRESETS['age-verification']).toEqual({
        date_of_birth: true,
        minimumAge: 18,
      });
    });

    it('full-passport includes all DG1 fields and ofac', () => {
      const preset = DISCLOSURE_PRESETS['full-passport'];
      expect(preset.issuing_state).toBe(true);
      expect(preset.name).toBe(true);
      expect(preset.passport_number).toBe(true);
      expect(preset.nationality).toBe(true);
      expect(preset.date_of_birth).toBe(true);
      expect(preset.gender).toBe(true);
      expect(preset.expiry_date).toBe(true);
      expect(preset.ofac).toBe(true);
    });

    it('ofac-only includes only ofac flag', () => {
      expect(DISCLOSURE_PRESETS['ofac-only']).toEqual({
        ofac: true,
      });
    });
  });

  describe('auto-detection', () => {
    it('infers endpointType celo from 0x endpoint', () => {
      const app = new SelfAppBuilder({
        appName: 'Test',
        scope: 'test',
        endpoint: '0xabcdef1234567890abcdef1234567890abcdef12',
        userId: 'a1b2c3d4-e5f6-1234-a678-9abcdef01234',
      }).build();
      expect(app.endpointType).toBe('celo');
    });

    it('infers endpointType https from https:// endpoint', () => {
      const app = new SelfAppBuilder({
        appName: 'Test',
        scope: 'test',
        endpoint: 'https://example.com/verify',
        userId: 'a1b2c3d4-e5f6-1234-a678-9abcdef01234',
      }).build();
      expect(app.endpointType).toBe('https');
    });

    it('does not override explicit endpointType', () => {
      const app = new SelfAppBuilder({
        appName: 'Test',
        scope: 'test',
        endpoint: '0xabcdef1234567890abcdef1234567890abcdef12',
        endpointType: 'staging_celo',
        userId: 'a1b2c3d4-e5f6-1234-a678-9abcdef01234',
      }).build();
      expect(app.endpointType).toBe('staging_celo');
    });

    it('infers userIdType hex from 0x userId', () => {
      const app = new SelfAppBuilder({
        appName: 'Test',
        scope: 'test',
        endpoint: '0xabcdef1234567890abcdef1234567890abcdef12',
        userId: '0xabcdef1234567890abcdef1234567890abcdef12',
      }).build();
      expect(app.userIdType).toBe('hex');
    });

    it('infers userIdType uuid from UUID userId', () => {
      const app = new SelfAppBuilder({
        appName: 'Test',
        scope: 'test',
        endpoint: 'https://example.com/verify',
        userId: 'a1b2c3d4-e5f6-1234-a678-9abcdef01234',
      }).build();
      expect(app.userIdType).toBe('uuid');
    });

    it('does not override explicit userIdType', () => {
      const app = new SelfAppBuilder({
        appName: 'Test',
        scope: 'test',
        endpoint: 'https://example.com/verify',
        userId: '0xabcdef1234567890abcdef1234567890abcdef12',
        userIdType: 'hex',
      }).build();
      expect(app.userIdType).toBe('hex');
    });
  });

  describe('auto-generate userId', () => {
    it('generates a UUID when userId is not provided', () => {
      const app = new SelfAppBuilder({
        appName: 'Test',
        scope: 'test',
        endpoint: 'https://example.com/verify',
      }).build();
      expect(app.userId).toBe('a1b2c3d4-e5f6-1234-a678-9abcdef01234');
      expect(app.userIdType).toBe('uuid');
    });

    it('uses provided userId when given', () => {
      const app = new SelfAppBuilder({
        appName: 'Test',
        scope: 'test',
        endpoint: 'https://example.com/verify',
        userId: 'a1b2c3d4-e5f6-1234-a678-9abcdef01234',
      }).build();
      expect(app.userId).toBe('a1b2c3d4-e5f6-1234-a678-9abcdef01234');
    });
  });

  describe('actionable validation errors', () => {
    it('suggests https:// for http endpoint', () => {
      expect(
        () =>
          new SelfAppBuilder({
            appName: 'Test',
            scope: 'test',
            endpoint: 'http://example.com/verify',
          }),
      ).toThrow("Did you mean 'https://example.com/verify'?");
    });

    it('shows current length for scope over 31 chars', () => {
      const longScope = 'a'.repeat(35);
      expect(
        () =>
          new SelfAppBuilder({
            appName: 'Test',
            scope: longScope,
            endpoint: 'https://example.com/verify',
          }),
      ).toThrow('35 characters');
    });

    it('identifies non-ASCII character in scope', () => {
      expect(
        () =>
          new SelfAppBuilder({
            appName: 'Test',
            scope: 'hello-wörld',
            endpoint: 'https://example.com/verify',
          }),
      ).toThrow('ö');
    });
  });

  describe('SelfAppBuilder.forContract', () => {
    it('creates builder for on-chain verification', () => {
      const app = SelfAppBuilder.forContract({
        appName: 'My DApp',
        contractAddress: '0xabcdef1234567890abcdef1234567890abcdef12',
        scopeSeed: 'my-seed',
      }).build();
      expect(app.endpoint).toBe('0xabcdef1234567890abcdef1234567890abcdef12');
      expect(app.scope).toBe('my-seed');
      expect(app.endpointType).toBe('celo');
      expect(app.appName).toBe('My DApp');
    });

    it('accepts optional overrides', () => {
      const app = SelfAppBuilder.forContract({
        appName: 'My DApp',
        contractAddress: '0xabcdef1234567890abcdef1234567890abcdef12',
        scopeSeed: 'my-seed',
        disclosures: 'basic-kyc',
        logoBase64: 'logo-data',
      }).build();
      expect(app.disclosures).toEqual({
        name: true,
        nationality: true,
        date_of_birth: true,
        ofac: true,
      });
      expect(app.logoBase64).toBe('logo-data');
    });

    it('defaults logoBase64 and header to empty string when not provided', () => {
      const app = SelfAppBuilder.forContract({
        appName: 'My DApp',
        contractAddress: '0xabcdef1234567890abcdef1234567890abcdef12',
        scopeSeed: 'my-seed',
      }).build();
      expect(app.logoBase64).toBe('');
      expect(app.header).toBe('');
    });

    it('supports staging_celo endpointType', () => {
      const app = SelfAppBuilder.forContract({
        appName: 'My DApp',
        contractAddress: '0xabcdef1234567890abcdef1234567890abcdef12',
        scopeSeed: 'my-seed',
        endpointType: 'staging_celo',
      }).build();
      expect(app.endpointType).toBe('staging_celo');
      expect(app.chainID).toBe(11142220);
    });
  });

  describe('SelfAppBuilder.forBackend', () => {
    it('creates builder for HTTPS backend verification', () => {
      const app = SelfAppBuilder.forBackend({
        appName: 'My App',
        endpoint: 'https://myapp.com/api/verify',
        scope: 'my-scope',
      }).build();
      expect(app.endpoint).toBe('https://myapp.com/api/verify');
      expect(app.scope).toBe('my-scope');
      expect(app.endpointType).toBe('https');
    });

    it('accepts optional overrides', () => {
      const app = SelfAppBuilder.forBackend({
        appName: 'My App',
        endpoint: 'https://myapp.com/api/verify',
        scope: 'my-scope',
        disclosures: { name: true, minimumAge: 21 },
        userId: 'a1b2c3d4-e5f6-1234-a678-9abcdef01234',
      }).build();
      expect(app.disclosures).toEqual({ name: true, minimumAge: 21 });
      expect(app.userId).toBe('a1b2c3d4-e5f6-1234-a678-9abcdef01234');
    });
  });

  describe('disclosure presets in builder', () => {
    it('resolves string preset to config object', () => {
      const app = new SelfAppBuilder({
        appName: 'Test',
        scope: 'test',
        endpoint: 'https://example.com/verify',
        disclosures: 'basic-kyc',
      }).build();
      expect(app.disclosures).toEqual({
        name: true,
        nationality: true,
        date_of_birth: true,
        ofac: true,
      });
    });

    it('passes through object disclosures unchanged', () => {
      const disclosures = { name: true, minimumAge: 21 };
      const app = new SelfAppBuilder({
        appName: 'Test',
        scope: 'test',
        endpoint: 'https://example.com/verify',
        disclosures,
      }).build();
      expect(app.disclosures).toEqual({ name: true, minimumAge: 21 });
    });

    it('throws for unknown preset name', () => {
      expect(
        () =>
          new SelfAppBuilder({
            appName: 'Test',
            scope: 'test',
            endpoint: 'https://example.com/verify',
            disclosures: 'nonexistent' as any,
          }),
      ).toThrow("Unknown disclosure preset 'nonexistent'");
    });
  });
});
