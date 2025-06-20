import type { BigNumberish } from 'ethers';
import type { SelfStructs } from '../typechain-types/IdentityVerificationHubImpl.js';
import { discloseIndices } from 'src/utils/constants.js';

export type VcAndDiscloseProof = {
  a: [BigNumberish, BigNumberish];
  b: [[BigNumberish, BigNumberish], [BigNumberish, BigNumberish]];
  c: [BigNumberish, BigNumberish];
  pubSignals: BigNumberish[];
};

export type VerificationConfig = SelfStructs.VerificationConfigV2Struct;

export type GenericDiscloseStruct = SelfStructs.VerificationConfigV2Struct;

export type AttestationId = keyof typeof discloseIndices;
