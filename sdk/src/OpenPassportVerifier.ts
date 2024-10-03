import { groth16 } from 'snarkjs';
import {
  countryCodes,
  DEFAULT_RPC_URL,
  ECDSA_K_LENGTH_FACTOR,
  k_dsc,
  k_dsc_ecdsa,
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
import {
  OpenPassportAttestation,
  parsePublicSignalsProve,
} from '../../common/src/utils/openPassportAttestation';

import forge from 'node-forge';
import { castToScope, splitToWords } from '../../common/src/utils/utils';
import { parseDSC } from '../../common/src/utils/certificates/handleCertificate';

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
  circuitMode?: string;
  constructor(options: {
    scope: string;
    attestationId?: string;
    olderThan?: string;
    nationality?: (typeof countryCodes)[keyof typeof countryCodes];
    rpcUrl?: string;
    dev_mode?: boolean;
    circuit: string;
    circuitMode?;
  }) {
    this.scope = options.scope;
    this.attestationId = options.attestationId || PASSPORT_ATTESTATION_ID;
    this.olderThan = options.olderThan || null;
    this.nationality = options.nationality || null;
    this.rpcUrl = options.rpcUrl || DEFAULT_RPC_URL;
    this.report = new OpenPassportVerifierReport();
    this.dev_mode = options.dev_mode || false;
    this.circuit = options.circuit;
    this.circuitMode = options.circuitMode || 'prove';
  }

  async verify(attestation: OpenPassportAttestation): Promise<OpenPassportVerifierReport> {
    const {
      proof: {
        value: { proof, publicSignals },
      },
      dsc: { value: dsc },
      dscProof: {
        value: { proof: dscProof, publicSignals: dscPublicSignals },
      },
    } = attestation;

    const { signatureAlgorithm, hashFunction } = parseDSC(dsc);
    const kScaled = signatureAlgorithm === 'ecdsa' ? ECDSA_K_LENGTH_FACTOR * k_dsc_ecdsa : k_dsc;
    this.parsedPublicSignals = parsePublicSignalsProve(publicSignals, kScaled);

    await this.verifyProof(proof, publicSignals, dsc);
    switch (this.circuit) {
      case 'prove':
        if (this.circuitMode === 'prove') {
          await this.verifyProveArguments();
          await this.verifyDsc(dsc);
        } else if (this.circuitMode === 'register') {
          await this.verifyRegisterArguments();
          await this.verifyDscProof(dscProof, dscPublicSignals, dsc);
        }
        break;
      case 'disclose':
        await this.verifyDiscloseArguments();
        break;
    }
    return this.report;
  }

  private async verifyProof(proof: string[], publicSignals: string[], dsc: string) {
    const vkey = this.getVkey(dsc);
    const verified_prove = await groth16.verify(vkey, publicSignals, proof as any);
    this.verifyAttribute('proof', verified_prove.toString(), 'true');
  }

  private async verifyProveArguments() {
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

  private async verifyDiscloseArguments() {}

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

  private getVkey(dsc: string) {
    const { signatureAlgorithm, hashFunction } = parseDSC(dsc);
    if (this.circuit === 'prove') {
      return getVkeyFromArtifacts(this.circuit, signatureAlgorithm, hashFunction);
    } else {
      throw new Error('vkey of ' + this.circuit + ' not found');
    }
  }

  private getVkeyDsc(dsc: string) {
    const { signatureAlgorithm, hashFunction } = parseDSC(dsc);
    return getVkeyFromArtifacts('dsc', signatureAlgorithm, hashFunction);
  }

  private verifyDsc(dsc: string) {
    const dscCertificate = forge.pki.certificateFromPem(dsc);
    const verified_certificate = verifyDSCValidity(dscCertificate, this.dev_mode);
    console.log('\x1b[34m%s\x1b[0m', '- certificate verified');
    if (!verified_certificate) {
      this.report.exposeAttribute('dsc', dsc, 'certificate chain is not valid');
    }

    const dsc_modulus = BigInt((dscCertificate.publicKey as any).n);
    const dsc_modulus_words = splitToWords(dsc_modulus, n_dsc, k_dsc);
    const pubKeyFromProof = this.parsedPublicSignals.pubKey_disclosed;

    const verified_modulus = areArraysEqual(dsc_modulus_words, pubKeyFromProof);
    console.log('\x1b[34m%s\x1b[0m', '- modulus verified');
    if (!verified_modulus) {
      this.report.exposeAttribute('pubKey', pubKeyFromProof, dsc_modulus_words);
    }
  }

  private async verifyDscProof(proof: string[], publicSignals: string[], dsc: string) {
    console.log('verifyDscProof', publicSignals, proof);
    const vkey = this.getVkeyDsc(dsc);
    const verified_dscProof = await groth16.verify(vkey, publicSignals, proof as any);
    this.verifyAttribute('dscProof', verified_dscProof.toString(), 'true');
  }

  private verifyRegisterArguments() {
    // verify that the blindedDscCommitment is the same in both proofs
    const blindedPubKeyCommitmentFromLocalProof = this.parsedPublicSignals.blinded_dsc_commitment;
  }
}
