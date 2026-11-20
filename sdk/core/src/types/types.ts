import { Country3LetterCode } from '@selfxyz/common/constants/countries';
import type { BigNumberish } from 'ethers';
import { discloseIndices } from 'src/utils/constants.js';

export type VcAndDiscloseProof = {
  a: [BigNumberish, BigNumberish];
  b: [[BigNumberish, BigNumberish], [BigNumberish, BigNumberish]];
  c: [BigNumberish, BigNumberish];
};

export type VerificationConfig = {
  minimumAge?: number;
  excludedCountries?: Country3LetterCode[];
  ofac?: boolean;
};

export type VerificationResult = {
  attestationId: AttestationId;
  isValidDetails: {
    isValid: boolean;
    isMinimumAgeValid: boolean;
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
  /**
   * Passport / EU ID card only: the part before `<<`. Read from the raw MRZ, so
   * it may not join back into `name` exactly (e.g. one-letter initials).
   */
  surname?: string;
  /**
   * Passport / EU ID card only: the part after `<<`, words space-separated. Read
   * from the raw MRZ, so it may not join back into `name` exactly (e.g. initials).
   */
  givenNames?: string;
  idNumber: string;
  nationality: string;
  dateOfBirth: string;
  gender: string;
  expiryDate: string;
  minimumAge: string;
  ofac: boolean[];
};

export type AttestationId = keyof typeof discloseIndices;
