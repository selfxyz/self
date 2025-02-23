import { registryAbi } from './abi/IdentityRegistryImplV1';
import { verifyAllAbi } from './abi/VerifyAll';
import { REGISTRY_ADDRESS, VERIFYALL_ADDRESS } from './constants/contractAddresses';
import { ethers } from 'ethers';
import { PublicSignals } from 'snarkjs';
import {
  countryCodes,
  countryNames,
  getCountryCode,
} from '../../../common/src/constants/constants';
import type { SelfVerificationResult } from '../../../common/src/utils/selfAttestation';
import { castToScope, castToUserIdentifier, UserIdType } from '../../../common/src/utils/circuits/uuid';
import { CIRCUIT_CONSTANTS, revealedDataTypes } from '../../../common/src/constants/constants';
import { packForbiddenCountriesList } from '../../../common/src/utils/contracts/formatCallData';

export class SelfBackendVerifier {
  protected scope: string;
  protected attestationId: number = 1;
  protected user_identifier_type: UserIdType = 'uuid';
  protected targetRootTimestamp: { enabled: boolean; value: number } = {
    enabled: false,
    value: 0,
  };

  protected nationality: {
    enabled: boolean;
    value: (typeof countryNames)[number];
  } = {
    enabled: false,
    value: '' as (typeof countryNames)[number],
  };
  protected minimumAge: { enabled: boolean; value: string } = {
    enabled: false,
    value: '18',
  };
  protected excludedCountries: {
    enabled: boolean;
    value: (typeof countryNames)[number][];
  } = {
    enabled: false,
    value: [],
  };
  protected passportNoOfac: boolean = false;
  protected nameAndDobOfac: boolean = false;
  protected nameAndYobOfac: boolean = false;

  protected registryContract: ethers.Contract;
  protected verifyAllContract: ethers.Contract;

  constructor(
    rpcUrl: string,
    scope: string,
    user_identifier_type: UserIdType = 'uuid'
  ) {
    const provider = new ethers.JsonRpcProvider(rpcUrl);
    this.registryContract = new ethers.Contract(REGISTRY_ADDRESS, registryAbi, provider);
    this.verifyAllContract = new ethers.Contract(VERIFYALL_ADDRESS, verifyAllAbi, provider);
    this.scope = scope;
    this.user_identifier_type = user_identifier_type;
  }

  public async verify(proof: any, publicSignals: PublicSignals): Promise<SelfVerificationResult> {
    const excludedCountryCodes = this.excludedCountries.value.map((country) =>
      getCountryCode(country)
    );
    const forbiddenCountriesListPacked = packForbiddenCountriesList(excludedCountryCodes);

    const isValidScope =
      this.scope ===
      castToScope(BigInt(publicSignals[CIRCUIT_CONSTANTS.VC_AND_DISCLOSE_SCOPE_INDEX]));

    const isValidAttestationId =
      this.attestationId.toString() ===
      publicSignals[CIRCUIT_CONSTANTS.VC_AND_DISCLOSE_ATTESTATION_ID_INDEX];

    const vcAndDiscloseHubProof = {
      olderThanEnabled: this.minimumAge.enabled,
      olderThan: this.minimumAge.value,
      forbiddenCountriesEnabled: this.excludedCountries.enabled,
      forbiddenCountriesListPacked: forbiddenCountriesListPacked,
      ofacEnabled: [this.passportNoOfac, this.nameAndDobOfac, this.nameAndYobOfac],
      vcAndDiscloseProof: {
        a: proof.a,
        b: [
          [proof.b[0][1], proof.b[0][0]],
          [proof.b[1][1], proof.b[1][0]],
        ],
        c: proof.c,
        pubSignals: publicSignals,
      },
    };

    const types = [
      revealedDataTypes.issuing_state,
      revealedDataTypes.name,
      revealedDataTypes.passport_number,
      revealedDataTypes.nationality,
      revealedDataTypes.date_of_birth,
      revealedDataTypes.gender,
      revealedDataTypes.expiry_date,
      revealedDataTypes.older_than,
      revealedDataTypes.passport_no_ofac,
      revealedDataTypes.name_and_dob_ofac,
      revealedDataTypes.name_and_yob_ofac,
    ];

    const currentRoot = await this.registryContract.getIdentityCommitmentMerkleRoot();
    const timestamp = await this.registryContract.rootTimestamps(currentRoot);

    const user_identifier = castToUserIdentifier(
      BigInt(publicSignals[CIRCUIT_CONSTANTS.VC_AND_DISCLOSE_USER_IDENTIFIER_INDEX]),
      this.user_identifier_type
    );

    let result: any;
    try {
      result = await this.verifyAllContract.verifyAll(timestamp, vcAndDiscloseHubProof, types);
    } catch (error) {
      return {
        isValid: false,
        isValidDetails: {
          isValidScope: false,
          isValidAttestationId: false,
          isValidProof: false,
          isValidNationality: false,
        },
        userId: user_identifier,
        application: this.scope,
        nullifier: publicSignals[CIRCUIT_CONSTANTS.VC_AND_DISCLOSE_NULLIFIER_INDEX],
        credentialSubject: {},
        proof: {
          value: {
            proof: proof,
            publicSignals: publicSignals,
          },
        },
        error: error,
      };
    }

    let isValidNationality = true;
    if (this.nationality.enabled) {
      const nationality = result[0][revealedDataTypes.nationality];
      const countryCode = countryCodes[nationality as keyof typeof countryCodes];
      isValidNationality = countryCode === this.nationality.value;
    }

    const credentialSubject = {
      merkle_root: publicSignals[CIRCUIT_CONSTANTS.VC_AND_DISCLOSE_MERKLE_ROOT_INDEX],
      attestation_id: this.attestationId.toString(),
      current_date: new Date().toISOString(),
      issuing_state: result[0][revealedDataTypes.issuing_state],
      name: result[0][revealedDataTypes.name],
      passport_number: result[0][revealedDataTypes.passport_number],
      nationality: result[0][revealedDataTypes.nationality],
      date_of_birth: result[0][revealedDataTypes.date_of_birth],
      gender: result[0][revealedDataTypes.gender],
      expiry_date: result[0][revealedDataTypes.expiry_date],
      older_than: result[0][revealedDataTypes.older_than].toString(),
      passport_no_ofac: result[0][revealedDataTypes.passport_no_ofac].toString() === '1',
      name_and_dob_ofac: result[0][revealedDataTypes.name_and_dob_ofac].toString() === '1',
      name_and_yob_ofac: result[0][revealedDataTypes.name_and_yob_ofac].toString() === '1',
    };

    const attestation: SelfVerificationResult = {
      isValid: result[1] && isValidScope && isValidAttestationId && isValidNationality,
      isValidDetails: {
        isValidScope: isValidScope,
        isValidAttestationId: isValidAttestationId,
        isValidProof: result[1],
        isValidNationality: isValidNationality,
      },
      userId: user_identifier,
      application: this.scope,
      nullifier: publicSignals[CIRCUIT_CONSTANTS.VC_AND_DISCLOSE_NULLIFIER_INDEX],
      credentialSubject: credentialSubject,
      proof: {
        value: {
          proof: proof,
          publicSignals: publicSignals,
        },
      },
      error: result[2],
    };

    return attestation;
  }

  setMinimumAge(age: number): this {
    if (age < 10) {
      throw new Error('Minimum age must be at least 10 years old');
    }
    if (age > 100) {
      throw new Error('Minimum age must be at most 100 years old');
    }
    this.minimumAge = { enabled: true, value: age.toString() };
    return this;
  }

  setNationality(country: (typeof countryNames)[number]): this {
    this.nationality = { enabled: true, value: country };
    return this;
  }

  excludeCountries(...countries: (typeof countryNames)[number][]): this {
    if (countries.length > 40) {
      throw new Error('Number of excluded countries cannot exceed 40');
    }
    this.excludedCountries = { enabled: true, value: countries };
    return this;
  }

  enablePassportNoOfacCheck(): this {
    this.passportNoOfac = true;
    return this;
  }

  enableNameAndDobOfacCheck(): this {
    this.nameAndDobOfac = true;
    return this;
  }

  enableNameAndYobOfacCheck(): this {
    this.nameAndYobOfac = true;
    return this;
  }
}
