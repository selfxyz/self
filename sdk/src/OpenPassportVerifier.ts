import { groth16 } from 'snarkjs';
import {
  countryCodes,
  DEFAULT_RPC_URL,
  k_dsc,
  n_dsc,
  PASSPORT_ATTESTATION_ID,
} from '../../common/src/constants/constants';
import {
  areArraysEqual,
  getAttributeFromUnpackedReveal,
  getCurrentDateFormatted,
  getVkeyFromArtifacts,
  verifyDSCValidity,
} from '../utils/utils';
import { unpackReveal } from '../../common/src/utils/revealBitmap';
import { OpenPassportVerifierReport } from './OpenPassportVerifierReport';

import forge from 'node-forge';
import {
  bigIntToHex,
  castToScope,
  castToUUID,
  splitToWords,
  UserIdType,
} from '../../common/src/utils/utils';
import { parseDSC } from '../../common/src/utils/handleCertificate';

export class OpenPassportVerifier {
  scope: string;
  attestationId: string;
  olderThan?: string;
  nationality?: (typeof countryCodes)[keyof typeof countryCodes];
  rpcUrl: string;
  report: OpenPassportVerifierReport;
  dev_mode: boolean;
  parsedPublicSignals: any;
  circuit: string;
  constructor(options: {
    scope: string;
    attestationId?: string;
    olderThan?: string;
    nationality?: (typeof countryCodes)[keyof typeof countryCodes];
    rpcUrl?: string;
    dev_mode?: boolean;
    circuit: string;
  }) {
    this.scope = options.scope;
    this.attestationId = options.attestationId || PASSPORT_ATTESTATION_ID;
    this.olderThan = options.olderThan || null;
    this.nationality = options.nationality || null;
    this.rpcUrl = options.rpcUrl || DEFAULT_RPC_URL;
    this.report = new OpenPassportVerifierReport();
    this.dev_mode = options.dev_mode || false;
    this.circuit = options.circuit;
  }

  async verify(
    openPassportVerifierInputs: OpenPassportVerifierInputs | any
  ): Promise<OpenPassportVerifierReport> {
    if (!(openPassportVerifierInputs instanceof OpenPassportVerifierInputs)) {
      openPassportVerifierInputs = new OpenPassportVerifierInputs(openPassportVerifierInputs);
    }

    this.parsedPublicSignals = openPassportVerifierInputs.getParsedPublicSignals();

    await this.verifyProof(openPassportVerifierInputs);
    switch (this.circuit) {
      case 'prove':
        await this.verifyProveArguments(openPassportVerifierInputs);
        await this.verifyDsc(openPassportVerifierInputs);
        break;
      case 'register':
        await this.verifyRegisterArguments();
        break;
      case 'disclose':
        await this.verifyDiscloseArguments();
        break;
    }
    return this.report;
  }

  private async verifyProof(openPassportVerifierInputs: OpenPassportVerifierInputs) {
    const vkey = this.getVkey(openPassportVerifierInputs);
    const verified_prove = await groth16.verify(
      vkey,
      openPassportVerifierInputs.dscProof.publicSignals,
      openPassportVerifierInputs.dscProof.proof as any
    );
    this.verifyAttribute('proof', verified_prove.toString(), 'true');
  }

  private async verifyProveArguments(openPassportVerifierInputs: OpenPassportVerifierInputs) {
    this.verifyAttribute('scope', castToScope(this.parsedPublicSignals.scope), this.scope);
    this.verifyAttribute(
      'current_date',
      this.parsedPublicSignals.current_date.toString(),
      getCurrentDateFormatted().toString()
    );

    // requirements
    const unpackedReveal = unpackReveal(this.parsedPublicSignals.revealedData_packed);
    if (this.olderThan) {
      const attributeValue = getAttributeFromUnpackedReveal(unpackedReveal, 'older_than');
      if (attributeValue > this.olderThan) {
        this.report.exposeAttribute('older_than', attributeValue, this.olderThan);
      }
    }
    if (this.nationality) {
      const attributeValue = getAttributeFromUnpackedReveal(unpackedReveal, 'nationality');
      this.verifyAttribute('nationality', countryCodes[attributeValue], this.nationality);
    }

    return this.report;
  }

  private async verifyRegisterArguments() { }

  private async verifyDiscloseArguments() { }

  private verifyAttribute(
    attribute: keyof OpenPassportVerifierReport,
    value: string,
    expectedValue: string
  ) {
    if (value !== expectedValue) {
      this.report.exposeAttribute(attribute, this.parsedPublicSignals[attribute], expectedValue);
    }
    console.log('\x1b[34m%s\x1b[0m', `- attribute ${attribute} verified`);
  }

  private getVkey(openPassportVerifierInputs: OpenPassportVerifierInputs) {
    if (this.circuit === 'prove' || this.circuit === 'register') {
      const { signatureAlgorithm, hashFunction } = parseDSC(
        openPassportVerifierInputs.dsc
      );
      return getVkeyFromArtifacts(this.circuit, signatureAlgorithm, hashFunction);
    } else {
      throw new Error('vkey of ' + this.circuit + ' not found');
    }
  }

  private verifyDsc(openPassportVerifierInputs: OpenPassportVerifierInputs) {
    const dscCertificate = forge.pki.certificateFromPem(openPassportVerifierInputs.dsc);
    const verified_certificate = verifyDSCValidity(dscCertificate, this.dev_mode);
    console.log('\x1b[32m%s\x1b[0m', 'certificate verified:' + verified_certificate);

    const dsc_modulus = BigInt((dscCertificate.publicKey as any).n);
    const dsc_modulus_words = splitToWords(dsc_modulus, n_dsc, k_dsc);
    const modulus_from_proof = this.parsedPublicSignals.pubKey;

    const verified_modulus = areArraysEqual(dsc_modulus_words, modulus_from_proof);
    console.log('\x1b[32m%s\x1b[0m', 'modulus verified:' + verified_modulus);
  }
}

export class OpenPassportVerifierInputs {
  dscProof: {
    publicSignals: string[];
    proof: string[];
  };
  dsc: string;
  circuit: string;
  userIdType?: UserIdType;
  constructor(options: {
    dscProof?: {
      publicSignals: string[];
      proof: string[];
    };
    dsc?: string;
    circuit?: string;
    userIdType?: UserIdType;
  }) {
    this.dscProof = options.dscProof || {
      publicSignals: [],
      proof: [],
    };
    this.dsc = options.dsc || '';
    this.circuit = options.circuit || ''; // useless
    this.userIdType = options.userIdType || 'uuid';
  }

  getParsedPublicSignals() {
    switch (this.circuit) {
      case 'prove':
        return parsePublicSignalsProve(this.dscProof.publicSignals);
      case 'register':
        return parsePublicSignalsRegister(this.dscProof.publicSignals);
    }
  }

  getUserId() {
    const rawUserId = (this.getParsedPublicSignals() as any).user_identifier;
    switch (this.userIdType) {
      case 'ascii':
        return castToScope(BigInt(rawUserId));
      case 'hex':
        return bigIntToHex(BigInt(rawUserId));
      case 'uuid':
        return castToUUID(BigInt(rawUserId));
    }
  }

  getNullifier() {
    return bigIntToHex(BigInt(this.getParsedPublicSignals().nullifier));
  }
}

export function parsePublicSignalsProve(publicSignals) {
  return {
    signature_algorithm: publicSignals[0],
    revealedData_packed: [publicSignals[1], publicSignals[2], publicSignals[3]],
    nullifier: publicSignals[4],
    pubKey: publicSignals.slice(5, 37),
    scope: publicSignals[37],
    current_date: publicSignals.slice(38, 44),
    user_identifier: publicSignals[44],
  };
}

export function parsePublicSignalsRegister(publicSignals) {
  return {
    nullifier: publicSignals[0],
    blinded_dsc_commitment: publicSignals[1],
    commitment: publicSignals[2],
    attestation_id: publicSignals[3],
  };
}
