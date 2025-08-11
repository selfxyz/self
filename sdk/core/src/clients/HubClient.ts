import { hubV2Abi } from '../abi/IdentityVerificationHubImplV2.js';
import type { IdentityVerificationHubAdapter, MigrationInfo } from '../adapters/HubAdapter.js';
import {
  createHubAdapterAuto,
  createHubAdapterWithMigration,
  HubMigrationUtils,
} from '../adapters/HubAdapter.js';

/**
 * Simple V2-focused client for Identity Verification Hub
 *
 * This is the preferred way to interact with the hub in new code.
 * For migration scenarios or V1 compatibility, use the IdentityVerificationHubAdapter instead.
 */
export class IdentityVerificationHubClient {
  private contract: any; // Will be properly typed when ethers integration is added

  constructor(
    contractAddress: string,
    _provider: any, // Replace with proper provider type
    _signer?: any // Replace with proper signer type
  ) {
    // TODO: Implement proper ethers contract creation
    this.contract = {
      address: contractAddress,
      abi: hubV2Abi,
      // Placeholder for ethers contract methods
      read: {},
      write: {},
    };
  }

  /**
   * Main verification function for V2
   * @param baseVerificationInput The base verification input data
   * @param userContextData The user context data
   */
  async verify(baseVerificationInput: Uint8Array, userContextData: Uint8Array): Promise<void> {
    return await this.contract.write.verify([baseVerificationInput, userContextData]);
  }

  /**
   * Register a commitment using a register circuit proof
   */
  async registerCommitment(
    attestationId: bigint,
    registerCircuitVerifierId: bigint,
    registerCircuitProof: {
      a: readonly [bigint, bigint];
      b: readonly [[bigint, bigint], [bigint, bigint]];
      c: readonly [bigint, bigint];
      pubSignals: readonly [bigint, bigint, bigint];
    }
  ): Promise<void> {
    return await this.contract.write.registerCommitment([
      attestationId,
      registerCircuitVerifierId,
      registerCircuitProof,
    ]);
  }

  /**
   * Register a DSC key commitment using a DSC circuit proof
   */
  async registerDscKeyCommitment(
    attestationId: bigint,
    dscCircuitVerifierId: bigint,
    dscCircuitProof: {
      a: readonly [bigint, bigint];
      b: readonly [[bigint, bigint], [bigint, bigint]];
      c: readonly [bigint, bigint];
      pubSignals: readonly [bigint, bigint];
    }
  ): Promise<void> {
    return await this.contract.write.registerDscKeyCommitment([
      attestationId,
      dscCircuitVerifierId,
      dscCircuitProof,
    ]);
  }

  /**
   * Set verification config for V2
   */
  async setVerificationConfigV2(config: unknown): Promise<bigint> {
    return await this.contract.write.setVerificationConfigV2([config]);
  }

  /**
   * Get verification config for V2
   */
  async getVerificationConfigV2(configId: bigint): Promise<unknown> {
    return await this.contract.read.getVerificationConfigV2([configId]);
  }

  /**
   * Check if verification config exists
   */
  async verificationConfigV2Exists(configId: bigint): Promise<boolean> {
    return await this.contract.read.verificationConfigV2Exists([configId]);
  }

  /**
   * Update registry address for a specific attestation
   */
  async updateRegistry(attestationId: bigint, registryAddress: string): Promise<void> {
    return await this.contract.write.updateRegistry([attestationId, registryAddress]);
  }

  /**
   * Update VC and Disclose circuit verifier for a specific attestation
   */
  async updateVcAndDiscloseCircuit(attestationId: bigint, verifierAddress: string): Promise<void> {
    return await this.contract.write.updateVcAndDiscloseCircuit([attestationId, verifierAddress]);
  }

  /**
   * Update register circuit verifier for a specific attestation and type
   */
  async updateRegisterCircuitVerifier(
    attestationId: bigint,
    typeId: bigint,
    verifierAddress: string
  ): Promise<void> {
    return await this.contract.write.updateRegisterCircuitVerifier([
      attestationId,
      typeId,
      verifierAddress,
    ]);
  }

  /**
   * Update DSC circuit verifier for a specific attestation and type
   */
  async updateDscVerifier(
    attestationId: bigint,
    typeId: bigint,
    verifierAddress: string
  ): Promise<void> {
    return await this.contract.write.updateDscVerifier([attestationId, typeId, verifierAddress]);
  }

  /**
   * Get registry address for a specific attestation
   */
  async getRegistry(attestationId: bigint): Promise<string> {
    return await this.contract.read.registries([attestationId]);
  }

  /**
   * Get VC and Disclose circuit verifier for a specific attestation
   */
  async getVcAndDiscloseCircuitVerifier(attestationId: bigint): Promise<string> {
    return await this.contract.read.discloseVerifiers([attestationId]);
  }

  /**
   * Get register circuit verifier for a specific attestation and type
   */
  async getRegisterCircuitVerifier(attestationId: bigint, typeId: bigint): Promise<string> {
    return await this.contract.read.registerCircuitVerifiers([attestationId, typeId]);
  }

  /**
   * Get DSC circuit verifier for a specific attestation and type
   */
  async getDscCircuitVerifier(attestationId: bigint, typeId: bigint): Promise<string> {
    return await this.contract.read.dscCircuitVerifiers([attestationId, typeId]);
  }
}

/**
 * Factory function to create an auto-detecting adapter
 * Use this for migration scenarios or when you need to support both V1 and V2.
 */
export function createHubAdapter(
  contractAddress: string,
  provider: any, // Replace with proper provider type
  _signer?: any // Replace with proper signer type
): Promise<IdentityVerificationHubAdapter> {
  return createHubAdapterAuto(contractAddress, provider);
}

/**
 * Factory function to create an adapter with migration validation
 * Use this when you want detailed migration guidance and validation.
 */
export function createHubAdapterWithValidation(
  contractAddress: string,
  provider: any, // Replace with proper provider type
  _signer?: any, // Replace with proper signer type
  options?: {
    forceVersion?: 'v1' | 'v2';
    validateMigration?: boolean;
    showWarnings?: boolean;
  }
): Promise<IdentityVerificationHubAdapter> {
  return createHubAdapterWithMigration(contractAddress, provider, options);
}

/**
 * Factory function to create a IdentityVerificationHubClient for V2
 * This is the preferred way to create a hub client for new code.
 */
export function createHubClient(
  contractAddress: string,
  provider: any, // Replace with proper provider type
  _signer?: any // Replace with proper signer type
): IdentityVerificationHubClient {
  return new IdentityVerificationHubClient(contractAddress, provider, _signer);
}

/**
 * Get detailed migration report for a contract
 * Use this to understand migration requirements and get step-by-step guidance.
 */
export async function getMigrationReport(
  contractAddress: string,
  provider: any // Replace with proper provider type
): Promise<{
  currentVersion: 'v1' | 'v2';
  canMigrate: boolean;
  migrationInfo: MigrationInfo;
  recommendations: string[];
}> {
  return await HubMigrationUtils.getMigrationReport(contractAddress, provider);
}

/**
 * Check if a contract supports V2 features
 * Use this to determine if V2 is available before attempting migration.
 */
export async function supportsV2(
  contractAddress: string,
  provider: any // Replace with proper provider type
): Promise<boolean> {
  return await HubMigrationUtils.supportsV2(contractAddress, provider);
}
