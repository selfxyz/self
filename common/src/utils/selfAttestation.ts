import { bigIntToHex, castToScope, castToUUID, UserIdType } from './circuits/uuid';
import { formatForbiddenCountriesListFromCircuitOutput, getAttributeFromUnpackedReveal } from './circuits/formatOutputs';
import { unpackReveal } from './circuits/formatOutputs';
import { Groth16Proof, PublicSignals } from 'snarkjs';

export interface SelfAttestation {
  '@context': string[];
  type: string[];
  issuer: string;
  issuanceDate: string;
  credentialSubject: {
    userId: string;
    application: string;
    scope?: string;
    merkle_root?: string;
    attestation_id?: string;
    targetRootTimestamp?: string;
    current_date?: string;
    issuing_state?: string;
    name?: string;
    passport_number?: string;
    nationality?: string;
    date_of_birth?: string;
    gender?: string;
    expiry_date?: string;
    older_than?: string;
    valid?: boolean;
    nullifier?: string;
  };
  proof: {
    type: string;
    verificationMethod: string;
    value: {
      proof: Groth16Proof;
      publicSignals: PublicSignals;
    };
    vkey: string;
  };
}

export function buildAttestation(options: {
  userIdType: UserIdType;
  proof: Groth16Proof;
  publicSignals: PublicSignals;
}): SelfAttestation {
  const {
    proof,
    publicSignals,
    userIdType,
  } = options;

  let parsedPublicSignals = parsePublicSignalsDisclose(publicSignals);

  const rawUserId = parsedPublicSignals.user_identifier;
  let userId: string;
  switch (userIdType) {
    case 'ascii':
      userId = castToScope(BigInt(rawUserId));
      break;
    case 'hex':
      userId = bigIntToHex(BigInt(rawUserId));
      break;
    case 'uuid':
      userId = castToUUID(BigInt(rawUserId));
      break;
    default:
      userId = rawUserId;
  }

  const scope = castToScope(BigInt(parsedPublicSignals.scope));

  // Unpack the revealed data
  const unpackedReveal = unpackReveal(parsedPublicSignals.revealedData_packed);

  const attributeNames = [
    'issuing_state',
    'name',
    'passport_number',
    'nationality',
    'date_of_birth',
    'gender',
    'expiry_date',
    'older_than',
    'ofac',
  ];
  const formattedCountryList = formatForbiddenCountriesListFromCircuitOutput(
    parsedPublicSignals.forbidden_countries_list_packed
  );
  const credentialSubject: any = {
    userId: userId,
    application: scope,
    nullifier: bigIntToHex(BigInt(parsedPublicSignals.nullifier)),
    scope: scope,
    current_date: parsedPublicSignals.current_date.toString(),
    not_in_countries: formattedCountryList,
  };

  attributeNames.forEach((attrName) => {
    const value = getAttributeFromUnpackedReveal(unpackedReveal, attrName);
    if (value !== undefined && value !== null) {
      credentialSubject[attrName] = value;
    }
  });

  const attestation: SelfAttestation = {
    '@context': ['https://www.w3.org/2018/credentials/v1', 'https://openpassport.app'],
    type: ['SelfAttestation', 'PassportCredential'],
    issuer: 'https://openpassport.app',
    issuanceDate: new Date().toISOString(),
    credentialSubject: credentialSubject,
    proof: {
      type: 'ZeroKnowledgeProof',
      verificationMethod: 'https://github.com/celo-org/self',
      value: {
        proof: proof,
        publicSignals: publicSignals,
      },
      vkey: 'https://github.com/zk-passport/openpassport/blob/main/common/src/constants/vkey.ts',
    },
  };

  // Return an instance of OpenPassportDynamicAttestation
  return new SelfAttestation(attestation, userIdType);
}
// New OpenPassportDynamicAttestation class extending OpenPassportAttestation
export class SelfAttestation implements SelfAttestation {
  '@context': string[];
  type: string[];
  issuer: string;
  issuanceDate: string;
  credentialSubject: {
    userId: string;
    application: string;
    scope?: string;
    merkle_root?: string;
    attestation_id?: string;
    current_date?: string;
    issuing_state?: string;
    name?: string;
    passport_number?: string;
    nationality?: string;
    date_of_birth?: string;
    gender?: string;
    expiry_date?: string;
    older_than?: string;
    owner_of?: string;
    pubKey?: string[];
    valid?: boolean;
    nullifier?: string;
  };
  proof: {
    type: string;
    verificationMethod: string;
    value: {
      proof: string[];
      publicSignals: string[];
    };
    vkey;
  };

  private userIdType: UserIdType;

  constructor(attestation: SelfAttestation, userIdType: UserIdType = 'uuid') {
    this['@context'] = attestation['@context'];
    this.type = attestation.type;
    this.issuer = attestation.issuer;
    this.issuanceDate = attestation.issuanceDate;
    this.credentialSubject = attestation.credentialSubject;
    this.proof = attestation.proof;
    this.userIdType = userIdType;
  }

  private parsePublicSignals() {
    return parsePublicSignalsDisclose(this.proof.value.publicSignals);
  }

  getUserId(): string {
    const parsedPublicSignals = this.parsePublicSignals();
    const rawUserId = (parsedPublicSignals as any).user_identifier;
    switch (this.userIdType) {
      case 'ascii':
        return castToScope(BigInt(rawUserId));
      case 'hex':
        return bigIntToHex(BigInt(rawUserId));
      case 'uuid':
        return castToUUID(BigInt(rawUserId));
      default:
        return rawUserId;
    }
  }

  getNullifier(): string {
    const parsedPublicSignals = this.parsePublicSignals();
    return bigIntToHex(BigInt(parsedPublicSignals.nullifier));
  }

  getNationality(): string {
    const parsedPublicSignals = this.parsePublicSignals();
    const revealedData_packed = (parsedPublicSignals as any).revealedData_packed;
    const unpackedReveal = unpackReveal(revealedData_packed);
    return getAttributeFromUnpackedReveal(unpackedReveal, 'nationality');
  }

}

export function parsePublicSignalsDisclose(publicSignals) {
  return {
    revealedData_packed: publicSignals.slice(0, 2),
    forbidden_countries_list_packed: publicSignals.slice(3),
    nullifier: publicSignals[4],
    attestation_id: publicSignals[5],
    merkle_root: publicSignals[6],
    current_date: publicSignals.slice(7, 12),
    smt_root: publicSignals[13],
    user_identifier: publicSignals[14],
    scope: publicSignals[15],
  };
}
