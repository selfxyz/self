import { describe, expect, it } from 'vitest';

import {
  CHAIN_CONFIG,
  getChainByEndpointType,
  getChainIdFromEndpointType,
  isOnchainEndpointType,
} from '../src/constants/chains.js';
import type { EndpointType } from '../src/utils/appType.js';
import { SelfAppBuilder } from '../src/utils/appType.js';

describe('Multichain Support', () => {
  describe('Chain Configuration', () => {
    it('should have correct Celo mainnet configuration', () => {
      const config = CHAIN_CONFIG[42220];
      expect(config.chainId).toBe(42220);
      expect(config.name).toBe('Celo');
      expect(config.isTestnet).toBe(false);
      expect(config.rpcUrl).toBe('https://forno.celo.org');
    });

    it('should have correct Celo Sepolia configuration', () => {
      const config = CHAIN_CONFIG[11142220];
      expect(config.chainId).toBe(11142220);
      expect(config.name).toBe('Celo Sepolia');
      expect(config.isTestnet).toBe(true);
    });

    it('should have correct Base mainnet configuration', () => {
      const config = CHAIN_CONFIG[8453];
      expect(config.chainId).toBe(8453);
      expect(config.name).toBe('Base');
      expect(config.isTestnet).toBe(false);
      expect(config.hubMultichainAddress).toBeDefined();
    });

    it('should have correct Base Sepolia configuration', () => {
      const config = CHAIN_CONFIG[84532];
      expect(config.chainId).toBe(84532);
      expect(config.name).toBe('Base Sepolia');
      expect(config.isTestnet).toBe(true);
    });

    it('should have correct Gnosis configuration', () => {
      const config = CHAIN_CONFIG[100];
      expect(config.chainId).toBe(100);
      expect(config.name).toBe('Gnosis');
      expect(config.isTestnet).toBe(false);
    });

    it('should have correct Optimism configuration', () => {
      const config = CHAIN_CONFIG[10];
      expect(config.chainId).toBe(10);
      expect(config.name).toBe('Optimism');
      expect(config.isTestnet).toBe(false);
    });
  });

  describe('getChainByEndpointType', () => {
    it('should return correct chain for celo endpoint', () => {
      const chain = getChainByEndpointType('celo');
      expect(chain.chainId).toBe(42220);
      expect(chain.name).toBe('Celo');
    });

    it('should return correct chain for staging_celo endpoint', () => {
      const chain = getChainByEndpointType('staging_celo');
      expect(chain.chainId).toBe(11142220);
      expect(chain.name).toBe('Celo Sepolia');
    });

    it('should return correct chain for base endpoint', () => {
      const chain = getChainByEndpointType('base');
      expect(chain.chainId).toBe(8453);
      expect(chain.name).toBe('Base');
    });

    it('should return correct chain for staging_base endpoint', () => {
      const chain = getChainByEndpointType('staging_base');
      expect(chain.chainId).toBe(84532);
      expect(chain.name).toBe('Base Sepolia');
    });

    it('should return correct chain for gnosis endpoint', () => {
      const chain = getChainByEndpointType('gnosis');
      expect(chain.chainId).toBe(100);
      expect(chain.name).toBe('Gnosis');
    });

    it('should return correct chain for optimism endpoint', () => {
      const chain = getChainByEndpointType('optimism');
      expect(chain.chainId).toBe(10);
      expect(chain.name).toBe('Optimism');
    });

    it('should throw error for https endpoint', () => {
      expect(() => getChainByEndpointType('https')).toThrow(
        'https is not a blockchain endpoint type',
      );
    });

    it('should throw error for staging_https endpoint', () => {
      expect(() => getChainByEndpointType('staging_https')).toThrow(
        'staging_https is not a blockchain endpoint type',
      );
    });
  });

  describe('getChainIdFromEndpointType', () => {
    it('should return correct chain ID for each endpoint type', () => {
      expect(getChainIdFromEndpointType('celo')).toBe(42220);
      expect(getChainIdFromEndpointType('staging_celo')).toBe(11142220);
      expect(getChainIdFromEndpointType('base')).toBe(8453);
      expect(getChainIdFromEndpointType('staging_base')).toBe(84532);
      expect(getChainIdFromEndpointType('gnosis')).toBe(100);
      expect(getChainIdFromEndpointType('optimism')).toBe(10);
    });
  });

  describe('isOnchainEndpointType', () => {
    it('should return true for all onchain endpoint types', () => {
      const onchainTypes: EndpointType[] = [
        'celo',
        'staging_celo',
        'base',
        'staging_base',
        'gnosis',
        'optimism',
      ];

      onchainTypes.forEach((type) => {
        expect(isOnchainEndpointType(type)).toBe(true);
      });
    });

    it('should return false for offchain endpoint types', () => {
      expect(isOnchainEndpointType('https')).toBe(false);
      expect(isOnchainEndpointType('staging_https')).toBe(false);
    });
  });

  describe('SelfAppBuilder - Multichain Endpoint Validation', () => {
    const baseConfig = {
      appName: 'Test App',
      scope: 'test_scope',
      userId: '550e8400-e29b-41d4-a716-446655440000',
    };

    it('should accept valid Base mainnet endpoint', () => {
      const builder = new SelfAppBuilder({
        ...baseConfig,
        endpointType: 'base',
        endpoint: '0x1234567890123456789012345678901234567890',
      });
      const app = builder.build();
      expect(app.endpointType).toBe('base');
      expect(app.chainID).toBe(42220); // Verification still happens on Celo
    });

    it('should accept valid Base Sepolia endpoint', () => {
      const builder = new SelfAppBuilder({
        ...baseConfig,
        endpointType: 'staging_base',
        endpoint: '0x1234567890123456789012345678901234567890',
      });
      const app = builder.build();
      expect(app.endpointType).toBe('staging_base');
      expect(app.chainID).toBe(11142220); // Verification happens on Celo Sepolia
    });

    it('should accept valid Gnosis endpoint', () => {
      const builder = new SelfAppBuilder({
        ...baseConfig,
        endpointType: 'gnosis',
        endpoint: '0x1234567890123456789012345678901234567890',
      });
      const app = builder.build();
      expect(app.endpointType).toBe('gnosis');
      expect(app.chainID).toBe(42220);
    });

    it('should accept valid Optimism endpoint', () => {
      const builder = new SelfAppBuilder({
        ...baseConfig,
        endpointType: 'optimism',
        endpoint: '0x1234567890123456789012345678901234567890',
      });
      const app = builder.build();
      expect(app.endpointType).toBe('optimism');
      expect(app.chainID).toBe(42220);
    });

    it('should reject non-address endpoints for multichain types', () => {
      expect(() =>
        new SelfAppBuilder({
          ...baseConfig,
          endpointType: 'base',
          endpoint: 'https://example.com',
        }),
      ).toThrow('endpoint must be a valid address');
    });

    it('should reject invalid address format for multichain types', () => {
      expect(() =>
        new SelfAppBuilder({
          ...baseConfig,
          endpointType: 'gnosis',
          endpoint: 'not-an-address',
        }),
      ).toThrow('endpoint must be a valid address');
    });
  });

  describe('Backwards Compatibility', () => {
    const baseConfig = {
      appName: 'Test App',
      scope: 'test_scope',
      userId: '550e8400-e29b-41d4-a716-446655440000',
    };

    it('should still work with existing celo endpoint', () => {
      const builder = new SelfAppBuilder({
        ...baseConfig,
        endpointType: 'celo',
        endpoint: '0x1234567890123456789012345678901234567890',
      });
      const app = builder.build();
      expect(app.endpointType).toBe('celo');
      expect(app.chainID).toBe(42220);
    });

    it('should still work with existing staging_celo endpoint', () => {
      const builder = new SelfAppBuilder({
        ...baseConfig,
        endpointType: 'staging_celo',
        endpoint: '0x1234567890123456789012345678901234567890',
      });
      const app = builder.build();
      expect(app.endpointType).toBe('staging_celo');
      expect(app.chainID).toBe(11142220);
    });

    it('should still work with existing https endpoint', () => {
      const builder = new SelfAppBuilder({
        ...baseConfig,
        endpointType: 'https',
        endpoint: 'https://example.com/verify',
      });
      const app = builder.build();
      expect(app.endpointType).toBe('https');
      expect(app.chainID).toBe(42220);
    });

    it('should still work with existing staging_https endpoint', () => {
      const builder = new SelfAppBuilder({
        ...baseConfig,
        endpointType: 'staging_https',
        endpoint: 'https://staging.example.com/verify',
      });
      const app = builder.build();
      expect(app.endpointType).toBe('staging_https');
      expect(app.chainID).toBe(11142220);
    });
  });
});



