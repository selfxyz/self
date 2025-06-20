import type { BigNumberish } from 'ethers';
import { discloseIndices } from 'src/utils/constants.js';

export type VcAndDiscloseProof = {
  a: [BigNumberish, BigNumberish];
  b: [[BigNumberish, BigNumberish], [BigNumberish, BigNumberish]];
  c: [BigNumberish, BigNumberish];
};

export type VerificationConfig = {
  olderThanEnabled: boolean;
  olderThan: string;
  forbiddenCountriesEnabled: boolean;
  forbiddenCountriesListPacked: string[];
  ofacEnabled: [boolean, boolean, boolean];
};

export type GenericDiscloseOutput = {
  nullifier: string;
  forbiddenCountriesListPacked: string[];
  issuingState: string;
  name: string;
  idNumber: string;
  nationality: string;
  dateOfBirth: string;
  gender: string;
  expiryDate: string;
  olderThan: string;
  ofac: boolean[];
}

export type AttestationId = keyof typeof discloseIndices;
