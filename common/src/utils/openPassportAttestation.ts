import {
  ECDSA_K_LENGTH_FACTOR,
  k_dsc,
  k_dsc_ecdsa,
} from '../constants/constants';
import { parseDSC } from './certificates/handleCertificate';
import {
  bigIntToHex,
  castToScope,
  castToUUID,
  UserIdType,
} from './utils';
import { unpackReveal } from './revealBitmap';
import { getAttributeFromUnpackedReveal } from './utils'
import { Mode } from 'fs';

export interface OpenPassportAttestation {
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
    mode: Mode;
    signatureAlgorithm: string;
    hashFunction: string;
    type: string;
    verificationMethod: string;
    value: {
      proof: string[];
      publicSignals: string[];
    };
    vkey: string;
  };
  dscProof: {
    signatureAlgorithm: string;
    hashFunction: string;
    type: string;
    verificationMethod: string;
    value: {
      proof: string[];
      publicSignals: string[];
    };
    vkey: string;
  };
  dsc: {
    type: string;
    value: string;
    encoding: string;
  };
}

export function buildAttestation(options: {
  userIdType: UserIdType;
  mode: Mode;
  proof: string[];
  publicSignals: string[];
  signatureAlgorithm: string;
  hashFunction: string;
  dscProof?: string[];
  dscPublicSignals?: string[];
  signatureAlgorithmDsc?: string;
  hashFunctionDsc?: string;
  dsc?: string;
}): OpenPassportDynamicAttestation {
  const {
    mode,
    proof,
    publicSignals,
    signatureAlgorithm,
    hashFunction,
    dscProof = [],
    dscPublicSignals = [],
    signatureAlgorithmDsc = '',
    hashFunctionDsc = '',
    dsc = '',
    userIdType,
  } = options;

  let kScaled: number;
  switch (signatureAlgorithm) {
    case 'ecdsa':
      kScaled = ECDSA_K_LENGTH_FACTOR * k_dsc_ecdsa;
      break;
    default:
      kScaled = k_dsc;
  }
  const parsedPublicSignals = parsePublicSignalsProve(publicSignals, kScaled);

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
  const unpackedReveal = unpackReveal(
    parsedPublicSignals.revealedData_packed
  );

  const attributeNames = [
    'issuing_state',
    'name',
    'passport_number',
    'nationality',
    'date_of_birth',
    'gender',
    'expiry_date',
    'older_than',
  ];

  const credentialSubject: any = {
    userId: userId,
    application: scope,
    nullifier: bigIntToHex(BigInt(parsedPublicSignals.nullifier)),
    scope: scope,
    current_date: parsedPublicSignals.current_date.toString(),
  };


  attributeNames.forEach((attrName) => {
    const value = getAttributeFromUnpackedReveal(unpackedReveal, attrName);
    if (value !== undefined && value !== null) {
      credentialSubject[attrName] = value;
    }
  });
  // Include pubKey if needed
  credentialSubject.pubKey = parsedPublicSignals.pubKey_disclosed;

  const attestation: OpenPassportAttestation = {
    '@context': [
      'https://www.w3.org/2018/credentials/v1',
      'https://openpassport.app',
    ],
    type: ['OpenPassportAttestation', 'PassportCredential'],
    issuer: 'https://openpassport.app',
    issuanceDate: new Date().toISOString(),
    credentialSubject: credentialSubject,
    proof: {
      mode: mode,
      signatureAlgorithm: signatureAlgorithm,
      hashFunction: hashFunction,
      type: 'ZeroKnowledgeProof',
      verificationMethod:
        'https://github.com/zk-passport/openpassport',
      value: {
        proof: proof,
        publicSignals: publicSignals,
      },
      vkey: 'https://github.com/zk-passport/openpassport/blob/main/common/src/constants/vkey.ts',
    },
    dscProof: {
      signatureAlgorithm: signatureAlgorithmDsc,
      hashFunction: hashFunctionDsc,
      type: 'ZeroKnowledgeProof',
      verificationMethod:
        'https://github.com/zk-passport/openpassport',
      value: {
        proof: dscProof || [],
        publicSignals: dscPublicSignals || [],
      },
      vkey: 'https://github.com/zk-passport/openpassport/blob/main/common/src/constants/vkey.ts',
    },
    dsc: {
      type: 'X509Certificate',
      value: dsc || '',
      encoding: 'PEM',
    },
  };

  // Return an instance of OpenPassportDynamicAttestation
  return new OpenPassportDynamicAttestation(attestation, userIdType);
}
// New OpenPassportDynamicAttestation class extending OpenPassportAttestation
export class OpenPassportDynamicAttestation implements OpenPassportAttestation {
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
    mode: Mode;
    signatureAlgorithm: string;
    hashFunction: string;
    type: string;
    verificationMethod: string;
    value: {
      proof: string[];
      publicSignals: string[];
    };
    vkey;
  };
  dscProof: {
    signatureAlgorithm: string;
    hashFunction: string;
    type: string;
    verificationMethod: string;
    value: {
      proof: string[];
      publicSignals: string[];
    };
    vkey;
  };
  dsc: {
    type: string;
    value: string;
    encoding: string;
  };

  private parsedPublicSignals: any;
  private userIdType: UserIdType;

  constructor(attestation: OpenPassportAttestation, userIdType: UserIdType = 'uuid') {
    this['@context'] = attestation['@context'];
    this.type = attestation.type;
    this.issuer = attestation.issuer;
    this.issuanceDate = attestation.issuanceDate;
    this.credentialSubject = attestation.credentialSubject;
    this.proof = attestation.proof;
    this.dscProof = attestation.dscProof;
    this.dsc = attestation.dsc;
    this.userIdType = userIdType;
  }

  private parsePublicSignals() {
    const dscParsed = parseDSC(this.dsc.value);

    let kScaled: number;
    const { signatureAlgorithm } = dscParsed;
    switch (signatureAlgorithm) {
      case 'ecdsa':
        kScaled = ECDSA_K_LENGTH_FACTOR * k_dsc_ecdsa;
        break;
      default:
        kScaled = k_dsc;
    }

    // Parse the public signals
    return parsePublicSignalsProve(this.proof.value.publicSignals, kScaled);
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
}

export function parsePublicSignalsProve(publicSignals, kScaled) {
  return {
    nullifier: publicSignals[0],
    revealedData_packed: [publicSignals[1], publicSignals[2], publicSignals[3]],
    older_than: [publicSignals[4], publicSignals[5]],
    pubKey_disclosed: publicSignals.slice(6, 6 + kScaled),
    forbidden_countries_list_packed_disclosed: publicSignals.slice(6 + kScaled, 8 + kScaled),
    ofac_result: publicSignals[8 + kScaled],
    commitment: publicSignals[9 + kScaled],
    blinded_dsc_commitment: publicSignals[10 + kScaled],
    current_date: publicSignals.slice(11 + kScaled, 11 + kScaled + 6),
    user_identifier: publicSignals[17 + kScaled],
    scope: publicSignals[18 + kScaled],
  };
}