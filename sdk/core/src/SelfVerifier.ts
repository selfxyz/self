import { SelfBackendVerifier } from './SelfBackendVerifier.js';
import { DefaultConfigStore } from './store/DefaultConfigStore.js';
import { verifyToken } from './verifyToken.js';
import type { VerifyTokenOptions, VerifyTokenResult } from './verifyToken.js';
import type { AttestationId, VcAndDiscloseProof, VerificationConfig, VerificationResult } from './types/types.js';
import type { BigNumberish } from 'ethers';
import type { UserIdType } from '@selfxyz/common/utils/circuits/uuid';

export type PresetName = 'human' | 'age-18' | 'age-21' | 'kyc-basic' | 'kyc-full';

// Backend verification config per preset. Controls what the verifier checks.
// Disclosure fields (name, nationality, etc.) are configured on the widget side via
// SelfAppDisclosureConfig, not here. kyc-basic and kyc-full both verify OFAC;
// the difference is in which fields the widget requests disclosure for.
const PRESET_CONFIGS: Record<PresetName, VerificationConfig> = {
  human: {},
  'age-18': { minimumAge: 18 },
  'age-21': { minimumAge: 21 },
  'kyc-basic': { ofac: true },
  'kyc-full': { ofac: true },
};

export interface SelfVerifierOptions {
  scope: string;
  endpoint: string;
  preset?: PresetName;
  config?: VerificationConfig;
  testnet?: boolean;
  allowedAttestationIds?: number[];
  userIdType?: UserIdType;
}

export class SelfVerifier {
  private backendVerifier: SelfBackendVerifier;
  private scope: string;

  constructor(options: SelfVerifierOptions) {
    const {
      scope,
      endpoint,
      preset,
      config,
      testnet = false,
      allowedAttestationIds = [1, 2, 3, 4],
      userIdType = 'uuid',
    } = options;

    this.scope = scope;

    // Build verification config from preset or explicit config
    let verificationConfig: VerificationConfig = {};
    if (config) {
      verificationConfig = config;
    } else if (preset) {
      verificationConfig = PRESET_CONFIGS[preset] ?? {};
    }

    const allowedIds = new Map<AttestationId, boolean>();
    for (const id of allowedAttestationIds) {
      allowedIds.set(id as AttestationId, true);
    }

    const configStore = new DefaultConfigStore(verificationConfig);

    this.backendVerifier = new SelfBackendVerifier(
      scope,
      endpoint,
      testnet,
      allowedIds,
      configStore,
      userIdType,
    );
  }

  async verify(
    attestationId: AttestationId,
    proof: VcAndDiscloseProof,
    publicSignals: BigNumberish[],
    userContextData: string,
  ): Promise<VerificationResult> {
    return this.backendVerifier.verify(attestationId, proof, publicSignals, userContextData);
  }

  async verifyToken(token: string, options?: VerifyTokenOptions): Promise<VerifyTokenResult> {
    return verifyToken(token, {
      audience: this.scope,
      ...options,
    });
  }
}
