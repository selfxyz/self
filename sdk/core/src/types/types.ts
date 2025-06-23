import { Country3LetterCode } from '@selfxyz/common';
import type { BigNumberish } from 'ethers';
import { discloseIndices } from 'src/utils/constants.js';

export type VcAndDiscloseProof = {
  a: [BigNumberish, BigNumberish];
  b: [[BigNumberish, BigNumberish], [BigNumberish, BigNumberish]];
  c: [BigNumberish, BigNumberish];
};

export type VerificationConfig = {
  olderThan?: number;
  excludedCountries?: Country3LetterCode[];
  ofac?: boolean;
};

export type VerificationResult = {
  attestationId: AttestationId;
  isValidDetails: {
    isValid: boolean;
    isOlderThanValid: boolean;
    isOfacValid: boolean;
  };
  forbiddenCountriesList: string[];
  discloseOutput: GenericDiscloseOutput;
  userData: {
    userIdentifier: string;
    userDefinedData: string;
  };
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
};

export type AttestationId = keyof typeof discloseIndices;
