import type { Abi } from 'viem';

import { hubV1Abi } from '../abi/IdentityVerificationHubImplV1';
import { hubV2Abi } from '../abi/IdentityVerificationHubImplV2';



// Unified Interface with migration support
export interface HubAdapter {
  // Version information
  readonly version: 'v1' | 'v2';
  readonly isLegacy: boolean;

  // Migration utilities
  getMigrationInfo(): MigrationInfo;
  canMigrateToV2(): boolean;
  getV2MigrationPath(): string[];

  // Verification methods
  verifyVcAndDisclose(proof: V1VcAndDiscloseHubProof): Promise<V1VcAndDiscloseVerificationResult>;
  verify(baseVerificationInput: Uint8Array, userContextData: Uint8Array): Promise<void>;

  // Registration methods
  registerPassportCommitment(
    attestationId: bigint,
    registerCircuitVerifierId: bigint,
    registerCircuitProof: V1RegisterCircuitProof
  ): Promise<void>;

  registerDscKeyCommitment(
    attestationId: bigint,
    dscCircuitVerifierId: bigint,
    dscCircuitProof: V1DscCircuitProof
  ): Promise<void>;

  // Configuration methods
  setVerificationConfigV2?(config: V2VerificationConfig): Promise<bigint>;

  // Getter methods
  getRegistry(): Promise<string>;
  getVcAndDiscloseCircuitVerifier(): Promise<string>;
}




// Migration-specific types
export interface MigrationInfo {
  currentVersion: 'v1' | 'v2';
  recommendedAction: 'upgrade' | 'migrate' | 'continue';
  migrationSteps: string[];
  breakingChanges: string[];
  newFeatures: string[];
}




export interface V1DscCircuitProof {
  a: readonly [bigint, bigint];
  b: readonly [[bigint, bigint], [bigint, bigint]];
  c: readonly [bigint, bigint];
  pubSignals: readonly [bigint, bigint];
}




export interface V1RegisterCircuitProof {
  a: readonly [bigint, bigint];
  b: readonly [[bigint, bigint], [bigint, bigint]];
  c: readonly [bigint, bigint];
  pubSignals: readonly [bigint, bigint, bigint];
}




// V1 Types
export interface V1VcAndDiscloseHubProof {
  olderThanEnabled: boolean;
  olderThan: bigint;
  forbiddenCountriesEnabled: boolean;
  forbiddenCountriesListPacked: readonly [bigint, bigint, bigint, bigint];
  ofacEnabled: readonly [boolean, boolean, boolean];
  vcAndDiscloseProof: {
    a: readonly [bigint, bigint];
    b: readonly [[bigint, bigint], [bigint, bigint]];
    c: readonly [bigint, bigint];
    pubSignals: readonly bigint[];
  };
}




export interface V1VcAndDiscloseVerificationResult {
  attestationId: bigint;
  scope: bigint;
  userIdentifier: bigint;
  nullifier: bigint;
  identityCommitmentRoot: bigint;
  revealedDataPacked: readonly [bigint, bigint, bigint];
  forbiddenCountriesListPacked: readonly [bigint, bigint, bigint, bigint];
}


// V2 Types
export interface V2VerificationConfig {
  // Add V2 config structure as needed
}

// Migration-focused error classes
export class HubMigrationError extends Error {
  constructor(
    message: string,
    public readonly currentVersion: 'v1' | 'v2',
    public readonly requiredVersion: 'v1' | 'v2',
    public readonly migrationSteps?: string[]
  ) {
    super(message);
    this.name = 'HubMigrationError';
  }
}


// Migration utilities
export class HubMigrationUtils {
  /**
   * Check if a contract supports V2 features
   */
  static async supportsV2(contractAddress: string, publicClient: any): Promise<boolean> {
    try {
      const contract = { address: contractAddress, abi: hubV2Abi };
      await publicClient.readContract({
        ...contract,
        functionName: 'verificationConfigV2Exists',
        args: ['0x0000000000000000000000000000000000000000000000000000000000000000']
      });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get detailed migration report for a contract
   */
  static async getMigrationReport(
    contractAddress: string,
    publicClient: any
  ): Promise<{
    currentVersion: 'v1' | 'v2';
    canMigrate: boolean;
    migrationInfo: MigrationInfo;
    recommendations: string[];
  }> {
    const isV2 = await this.supportsV2(contractAddress, publicClient);
    const currentVersion = isV2 ? 'v2' : 'v1';

    // Create temporary adapter to get migration info
    const tempContract = { address: contractAddress, abi: isV2 ? hubV2Abi : hubV1Abi };
    const adapter = isV2
      ? new HubV2Adapter(tempContract, publicClient, contractAddress)
      : new HubV1Adapter(tempContract, publicClient, contractAddress);

    const migrationInfo = adapter.getMigrationInfo();
    const canMigrate = adapter.canMigrateToV2();

    const recommendations = [
      currentVersion === 'v1'
        ? 'Consider migrating to V2 for new features and better performance'
        : 'You are using V2 - consider using HubClient for better type safety',
      'Review breaking changes before migration',
      'Test thoroughly in staging environment',
      'Update documentation and error handling'
    ];

    return {
      currentVersion,
      canMigrate,
      migrationInfo,
      recommendations
    };
  }

  /**
   * Validate migration readiness
   */
  static validateMigrationReadiness(
    currentAdapter: HubAdapter,
    targetVersion: 'v1' | 'v2'
  ): { ready: boolean; issues: string[] } {
    const issues: string[] = [];

    if (currentAdapter.version === targetVersion) {
      issues.push('Already on target version');
      return { ready: false, issues };
    }

    if (targetVersion === 'v2' && !currentAdapter.canMigrateToV2()) {
      issues.push('V2 not available on current network');
    }

    if (currentAdapter.version === 'v1') {
      issues.push('Review breaking changes in migration guide');
      issues.push('Update error handling for V2 error types');
      issues.push('Test all verification flows with V2');
    }

    return {
      ready: issues.length === 0,
      issues
    };
  }
}



// V1 Implementation with migration guidance
export class HubV1Adapter implements HubAdapter {
  readonly version = 'v1' as const;
  readonly isLegacy = true;

  constructor(
    private contract: any, // Replace with proper contract type
    private publicClient: any, // Replace with proper client type
    private contractAddress: string
  ) {}

  getMigrationInfo(): MigrationInfo {
    return {
      currentVersion: 'v1',
      recommendedAction: 'upgrade',
      migrationSteps: [
        'Deploy V2 implementation using deployHubV2.ts',
        'Update contract references to use V2 addresses',
        'Migrate from verifyVcAndDisclose() to verify() method',
        'Update registration calls to include attestationId parameter',
        'Configure V2 verification configs using setVerificationConfigV2()',
        'Update error handling for new V2 error types'
      ],
      breakingChanges: [
        'verifyVcAndDisclose() method removed in V2',
        'Registration methods now require attestationId parameter',
        'Registry and verifier addresses are now per-attestation',
        'New verification config system replaces hardcoded parameters'
      ],
      newFeatures: [
        'Multi-attestation support (passport, ID cards)',
        'Configurable verification parameters',
        'Cross-chain verification support (future)',
        'Improved error handling and validation',
        'Better gas optimization'
      ]
    };
  }

  canMigrateToV2(): boolean {
    // Check if V2 is available on the same network
    return true; // Simplified - in practice, check if V2 contract exists
  }

  getV2MigrationPath(): string[] {
    return [
      '1. Deploy V2 implementation: yarn deploy:hub:v2',
      '2. Update contract address references',
      '3. Replace verifyVcAndDisclose() calls with verify()',
      '4. Add attestationId to registration calls',
      '5. Configure V2 verification settings',
      '6. Update error handling',
      '7. Test thoroughly before switching'
    ];
  }

  async verifyVcAndDisclose(proof: V1VcAndDiscloseHubProof): Promise<V1VcAndDiscloseVerificationResult> {
    return await this.contract.read.verifyVcAndDisclose([proof]);
  }

  async verify(baseVerificationInput: Uint8Array, userContextData: Uint8Array): Promise<void> {
    throw new HubVersionError(
      'V1 does not support the new verify method. Use verifyVcAndDisclose instead, or migrate to V2.',
      'v1',
      'verify'
    );
  }

  async registerPassportCommitment(
    attestationId: bigint,
    registerCircuitVerifierId: bigint,
    registerCircuitProof: V1RegisterCircuitProof
  ): Promise<void> {
    // V1 doesn't have attestationId parameter - log migration guidance
    console.warn(
      `[Migration Notice] V1 registerPassportCommitment() doesn't use attestationId. ` +
      `Consider migrating to V2 for multi-attestation support. ` +
      `Contract: ${this.contractAddress}`
    );

    await this.contract.write.registerPassportCommitment([registerCircuitVerifierId, registerCircuitProof]);
  }

  async registerDscKeyCommitment(
    attestationId: bigint,
    dscCircuitVerifierId: bigint,
    dscCircuitProof: V1DscCircuitProof
  ): Promise<void> {
    // V1 doesn't have attestationId parameter - log migration guidance
    console.warn(
      `[Migration Notice] V1 registerDscKeyCommitment() doesn't use attestationId. ` +
      `Consider migrating to V2 for multi-attestation support. ` +
      `Contract: ${this.contractAddress}`
    );

    await this.contract.write.registerDscKeyCommitment([dscCircuitVerifierId, dscCircuitProof]);
  }

  async getRegistry(): Promise<string> {
    return await this.contract.read.registry();
  }

  async getVcAndDiscloseCircuitVerifier(): Promise<string> {
    return await this.contract.read.vcAndDiscloseCircuitVerifier();
  }
}



// V2 Implementation with migration support
export class HubV2Adapter implements HubAdapter {
  readonly version = 'v2' as const;
  readonly isLegacy = false;

  constructor(
    private contract: any, // Replace with proper contract type
    private publicClient: any, // Replace with proper client type
    private contractAddress: string
  ) {}

  getMigrationInfo(): MigrationInfo {
    return {
      currentVersion: 'v2',
      recommendedAction: 'continue',
      migrationSteps: [
        'You are already using V2 - no migration needed',
        'Consider using the dedicated HubClient for better type safety',
        'Explore new V2 features like multi-attestation support'
      ],
      breakingChanges: [],
      newFeatures: [
        'Multi-attestation support (passport, ID cards)',
        'Configurable verification parameters',
        'Cross-chain verification support (future)',
        'Improved error handling and validation',
        'Better gas optimization'
      ]
    };
  }

  canMigrateToV2(): boolean {
    return false; // Already on V2
  }

  getV2MigrationPath(): string[] {
    return ['Already on V2 - no migration needed'];
  }

  async verifyVcAndDisclose(proof: V1VcAndDiscloseHubProof): Promise<V1VcAndDiscloseVerificationResult> {
    throw new HubVersionError(
      'V2 does not support verifyVcAndDisclose. Use verify method instead.',
      'v2',
      'verifyVcAndDisclose'
    );
  }

  async verify(baseVerificationInput: Uint8Array, userContextData: Uint8Array): Promise<void> {
    await this.contract.write.verify([baseVerificationInput, userContextData]);
  }

  async registerPassportCommitment(
    attestationId: bigint,
    registerCircuitVerifierId: bigint,
    registerCircuitProof: V1RegisterCircuitProof
  ): Promise<void> {
    await this.contract.write.registerCommitment([attestationId, registerCircuitVerifierId, registerCircuitProof]);
  }

  async registerDscKeyCommitment(
    attestationId: bigint,
    dscCircuitVerifierId: bigint,
    dscCircuitProof: V1DscCircuitProof
  ): Promise<void> {
    await this.contract.write.registerDscKeyCommitment([attestationId, dscCircuitVerifierId, dscCircuitProof]);
  }

  async setVerificationConfigV2(config: V2VerificationConfig): Promise<bigint> {
    return await this.contract.write.setVerificationConfigV2([config]);
  }

  async getRegistry(): Promise<string> {
    // V2 has multiple registries, need to specify attestationId
    throw new HubVersionError(
      'V2 requires attestationId to get registry. Use getRegistry(attestationId) instead.',
      'v2',
      'getRegistry'
    );
  }

  async getVcAndDiscloseCircuitVerifier(): Promise<string> {
    // V2 has multiple verifiers, need to specify attestationId
    throw new HubVersionError(
      'V2 requires attestationId to get verifier. Use getVcAndDiscloseCircuitVerifier(attestationId) instead.',
      'v2',
      'getVcAndDiscloseCircuitVerifier'
    );
  }
}



export class HubVersionError extends Error {
  constructor(
    message: string,
    public readonly currentVersion: 'v1' | 'v2',
    public readonly operation: string
  ) {
    super(message);
    this.name = 'HubVersionError';
  }
}

// Factory function to create the appropriate adapter
export function createHubAdapter(
  contractAddress: string,
  version: 'v1' | 'v2',
  publicClient: any // Replace with proper client type
): HubAdapter {
  const abi = version === 'v1' ? hubV1Abi : hubV2Abi;

  // Create contract instance (replace with proper contract creation)
  const contract = {
    read: {},
    write: {},
    abi
  };

  return version === 'v1'
    ? new HubV1Adapter(contract, publicClient, contractAddress)
    : new HubV2Adapter(contract, publicClient, contractAddress);
}


// Auto-detecting factory with migration support
export async function createHubAdapterAuto(
  contractAddress: string,
  publicClient: any // Replace with proper client type
): Promise<HubAdapter> {
  const version = await detectHubVersion(contractAddress, publicClient);
  const adapter = createHubAdapter(contractAddress, version, publicClient);

  // Log migration guidance for V1 users
  if (adapter.version === 'v1') {
    console.warn(
      `[Migration Notice] Using V1 hub at ${contractAddress}. ` +
      `Consider migrating to V2 for new features. ` +
      `Run getMigrationInfo() for details.`
    );
  }

  return adapter;
}



// Migration-focused factory with validation
export async function createHubAdapterWithMigration(
  contractAddress: string,
  publicClient: any, // Replace with proper client type
  options?: {
    forceVersion?: 'v1' | 'v2';
    validateMigration?: boolean;
    showWarnings?: boolean;
  }
): Promise<HubAdapter> {
  const { forceVersion, validateMigration = true, showWarnings = true } = options || {};

  const version = forceVersion || await detectHubVersion(contractAddress, publicClient);
  const adapter = createHubAdapter(contractAddress, version, publicClient);

  if (showWarnings && adapter.version === 'v1') {
    console.warn(
      `[Migration Notice] Using V1 hub at ${contractAddress}. ` +
      `Consider migrating to V2 for new features. ` +
      `Run getMigrationInfo() for details.`
    );
  }

  if (validateMigration && adapter.version === 'v1') {
    const readiness = HubMigrationUtils.validateMigrationReadiness(adapter, 'v2');
    if (!readiness.ready) {
      console.warn('[Migration Validation] Issues found:', readiness.issues);
    }
  }

  return adapter;
}


// Helper to detect version from contract
export async function detectHubVersion(
  contractAddress: string,
  publicClient: any // Replace with proper client type
): Promise<'v1' | 'v2'> {
  try {
    // Try to call a V2-specific method
    const contract = { address: contractAddress, abi: hubV2Abi };
    await publicClient.readContract({
      ...contract,
      functionName: 'verificationConfigV2Exists',
      args: ['0x0000000000000000000000000000000000000000000000000000000000000000']
    });
    return 'v2';
  } catch {
    // If V2 method fails, assume V1
    return 'v1';
  }
}
