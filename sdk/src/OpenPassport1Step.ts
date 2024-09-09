import { groth16 } from 'snarkjs';
import {
  attributeToPosition,
  countryCodes,
  DEFAULT_RPC_URL,
  PASSPORT_ATTESTATION_ID,
} from '../../common/src/constants/constants';
import { getCurrentDateFormatted, getVkey, verifyDSCValidity } from '../utils/utils';
import { unpackReveal } from '../../common/src/utils/revealBitmap';
import { OpenPassportVerifierReport } from './OpenPassportVerifierReport';

import forge from 'node-forge';
import {
  bigIntToHex,
  castFromScope,
  castToScope,
  castToUUID,
  hexToUUID,
  splitToWords,
  UserIdType,
} from '../../common/src/utils/utils';
import { getSignatureAlgorithm } from '../../common/src/utils/handleCertificate';

export class OpenPassport1StepVerifier {
  scope: string;
  attestationId: string;
  olderThan?: string;
  nationality?: (typeof countryCodes)[keyof typeof countryCodes];
  rpcUrl: string;
  report: OpenPassportVerifierReport;
  dev_mode: boolean;
  constructor(options: {
    scope: string;
    attestationId?: string;
    olderThan?: string;
    nationality?: (typeof countryCodes)[keyof typeof countryCodes];
    rpcUrl?: string;
    dev_mode?: boolean;
  }) {
    this.scope = options.scope;
    this.attestationId = options.attestationId || PASSPORT_ATTESTATION_ID;
    this.olderThan = options.olderThan || null;
    this.nationality = options.nationality || null;
    this.rpcUrl = options.rpcUrl || DEFAULT_RPC_URL;
    this.report = new OpenPassportVerifierReport();
    this.dev_mode = options.dev_mode || false;
  }

  async verify(
    openPassport1StepInputs: OpenPassport1StepInputs
  ): Promise<OpenPassportVerifierReport> {
    const { signatureAlgorithm, hashFunction } = getSignatureAlgorithm(openPassport1StepInputs.dsc);
    const vkey = getVkey(openPassport1StepInputs.circuit, signatureAlgorithm, hashFunction);
    const parsedPublicSignals = parsePublicSignals1Step(
      openPassport1StepInputs.dscProof.publicSignals
    );
    //1. Verify the scope
    if (castToScope(parsedPublicSignals.scope) !== this.scope) {
      this.report.exposeAttribute('scope', parsedPublicSignals.scope, this.scope);
    }
    console.log('\x1b[32m%s\x1b[0m', `- scope verified`);

    //4. Verify the current_date
    if (parsedPublicSignals.current_date.toString() !== getCurrentDateFormatted().toString()) {
      this.report.exposeAttribute(
        'current_date',
        parsedPublicSignals.current_date,
        getCurrentDateFormatted()
      );
    }
    console.log('\x1b[32m%s\x1b[0m', `- current_date verified`);

    //5. Verify requirements
    const unpackedReveal = unpackReveal(parsedPublicSignals.revealedData_packed);

    if (this.olderThan) {
      // older_than
      const attribute = 'older_than';
      const value = this.olderThan;
      const position = attributeToPosition[attribute];
      let attributeValue = '';
      for (let i = position[0]; i <= position[1]; i++) {
        attributeValue += unpackedReveal[i];
      }
      if (attributeValue !== value) {
        this.report.exposeAttribute(
          attribute as keyof OpenPassportVerifierReport,
          attributeValue,
          value
        );
      }
      console.log('\x1b[32m%s\x1b[0m', `- requirement ${attribute} verified`);
    }

    if (this.nationality) {
      // nationality
      const attribute = 'nationality';
      const value = this.nationality;
      const position = attributeToPosition[attribute];
      let attributeValue = '';
      for (let i = position[0]; i <= position[1]; i++) {
        attributeValue += unpackedReveal[i];
      }
      if (!countryCodes[attributeValue] || countryCodes[attributeValue] !== value) {
        this.report.exposeAttribute(
          attribute as keyof OpenPassportVerifierReport,
          attributeValue,
          value
        );
      }
      console.log('\x1b[32m%s\x1b[0m', `- requirement ${attribute} verified`);
    }

    //6. Verify the proof

    const verified_prove = await groth16.verify(
      vkey,
      openPassport1StepInputs.dscProof.publicSignals,
      openPassport1StepInputs.dscProof.proof as any
    );
    if (!verified_prove) {
      this.report.exposeAttribute('proof');
    }
    console.log('\x1b[32m%s\x1b[0m', `- proof verified`);

    //7 Verify the dsc
    const dscCertificate = forge.pki.certificateFromPem(openPassport1StepInputs.dsc);
    const verified_certificate = verifyDSCValidity(dscCertificate, this.dev_mode);
    console.log('\x1b[32m%s\x1b[0m', 'certificate verified:' + verified_certificate);

    // @ts-ignore
    const dsc_modulus = BigInt(dscCertificate.publicKey.n);
    const dsc_modulus_words = splitToWords(dsc_modulus, BigInt(64), BigInt(32));
    const modulus_from_proof = parsedPublicSignals.pubKey;

    const areArraysEqual = (arr1: string[], arr2: string[]) =>
      arr1.length === arr2.length && arr1.every((value, index) => value === arr2[index]);

    const verified_modulus = areArraysEqual(dsc_modulus_words, modulus_from_proof);
    console.log('\x1b[32m%s\x1b[0m', 'modulus verified:' + verified_modulus);
    return this.report;
  }
}

export class OpenPassport1StepInputs {
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
    this.circuit = options.circuit || '';
    this.userIdType = options.userIdType || 'uuid';
  }

  getParsedPublicSignals() {
    return parsePublicSignals1Step(this.dscProof.publicSignals);
  }

  getUserId() {
    const rawUserId = this.getParsedPublicSignals().user_identifier;
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

export function parsePublicSignals1Step(publicSignals) {
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
