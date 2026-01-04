import type { EndpointType } from '../utils/appType.js';

export interface ChainConfig {
  chainId: number;
  name: string;
  isTestnet: boolean;
  rpcUrl: string;
  hubAddress?: string;              // IdentityVerificationHubImplV2 (on Celo)
  hubMultichainAddress?: string;    // IdentityVerificationHubMultichain (on destination chains)
}

export const CHAIN_CONFIG: Record<number, ChainConfig> = {
  // Celo
  42220: {
    chainId: 42220,
    name: 'Celo',
    isTestnet: false,
    rpcUrl: 'https://forno.celo.org',
    hubAddress: '0x...', // TODO: Update after deployment
  },
  11142220: {
    chainId: 11142220,
    name: 'Celo Sepolia',
    isTestnet: true,
    rpcUrl: 'https://celo-sepolia.drpc.org',
    hubAddress: '0x...', // TODO: Update after deployment
  },

  // Base
  8453: {
    chainId: 8453,
    name: 'Base',
    isTestnet: false,
    rpcUrl: 'https://mainnet.base.org',
    hubMultichainAddress: '0x...', // TODO: Update after deployment
  },
  84532: {
    chainId: 84532,
    name: 'Base Sepolia',
    isTestnet: true,
    rpcUrl: 'https://sepolia.base.org',
    hubMultichainAddress: '0x...', // TODO: Update after deployment
  },

  // Gnosis
  100: {
    chainId: 100,
    name: 'Gnosis',
    isTestnet: false,
    rpcUrl: 'https://rpc.gnosischain.com',
    hubMultichainAddress: '0x...', // TODO: Update after deployment
  },

  // Optimism
  10: {
    chainId: 10,
    name: 'Optimism',
    isTestnet: false,
    rpcUrl: 'https://mainnet.optimism.io',
    hubMultichainAddress: '0x...', // TODO: Update after deployment
  },

  // TODO: [SOLANA] Add Solana support
  // Add after EVM chains are stable
} as const;

/**
 * Get chain configuration by EndpointType
 * @param endpointType The endpoint type from SelfApp
 * @returns Chain configuration
 * @throws Error if endpointType is not a blockchain type or chain is not found
 */
export function getChainByEndpointType(endpointType: EndpointType): ChainConfig {
  switch (endpointType) {
    case 'celo':
      return CHAIN_CONFIG[42220];
    case 'staging_celo':
      return CHAIN_CONFIG[11142220];
    case 'base':
      return CHAIN_CONFIG[8453];
    case 'staging_base':
      return CHAIN_CONFIG[84532];
    case 'gnosis':
      return CHAIN_CONFIG[100];
    case 'optimism':
      return CHAIN_CONFIG[10];
    case 'https':
    case 'staging_https':
      throw new Error(`${endpointType} is not a blockchain endpoint type`);
    default:
      throw new Error(`No chain config for ${endpointType}`);
  }
}

/**
 * Get chain ID from EndpointType
 * @param endpointType The endpoint type from SelfApp
 * @returns Chain ID
 */
export function getChainIdFromEndpointType(endpointType: EndpointType): number {
  return getChainByEndpointType(endpointType).chainId;
}

/**
 * Check if an EndpointType is an onchain type (blockchain-based)
 * @param endpointType The endpoint type to check
 * @returns true if onchain, false if offchain (https)
 */
export function isOnchainEndpointType(endpointType: EndpointType): boolean {
  const onchainTypes: EndpointType[] = [
    'celo',
    'staging_celo',
    'base',
    'staging_base',
    'gnosis',
    'optimism',
    // TODO: [SOLANA] Add 'solana', 'staging_solana' when implemented
  ];
  const result = onchainTypes.includes(endpointType);
  // #region agent log
  fetch('http://127.0.0.1:7243/ingest/c221fb1a-a001-4333-87b7-a57e506cd0d8',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'chains.ts:isOnchainEndpointType',message:'isOnchainEndpointType called',data:{endpointType,result,onchainTypesLength:onchainTypes.length},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'B'})}).catch(()=>{});
  // #endregion
  return result;
}
