import { Mode } from 'fs';
import forge from 'node-forge';
import { groth16 } from 'snarkjs';

import {
  countryCodes,
  countryNames,
  ECDSA_K_LENGTH_FACTOR,
  k_dsc,
  k_dsc_ecdsa,
  n_dsc,
} from '../../../common/src/constants/constants';
import { splitToWords } from '../../../common/src/utils/bytes';
import { PublicKeyDetailsRSA } from '../../../common/src/utils/certificate_parsing/dataStructure';
import { parseCertificateSimple } from '../../../common/src/utils/certificate_parsing/parseCertificateSimple';
import {
  formatForbiddenCountriesListFromCircuitOutput,
  getAttributeFromUnpackedReveal,
  getOlderThanFromCircuitOutput,
  unpackReveal,
} from '../../../common/src/utils/circuits/formatOutputs';
import { castToScope } from '../../../common/src/utils/circuits/uuid';
import {
  OpenPassportAttestation,
  parsePublicSignalsDisclose,
  parsePublicSignalsDsc,
  parsePublicSignalsProve,
} from '../../../common/src/utils/openPassportAttestation';
import { fetchTreeFromUrl, getCscaTreeRoot } from '../../../common/src/utils/trees';
import {
  areArraysEqual,
  getCurrentDateFormatted,
  getVkeyFromArtifacts,
  verifyDSCValidity,
} from '../utils/utils';
import { OpenPassportVerifierReport } from './OpenPassportVerifierReport';

export class AttestationVerifier {
  protected devMode: boolean;
  protected scope: string;
  protected report: OpenPassportVerifierReport;
  protected minimumAge: { enabled: boolean; value: string } = { enabled: false, value: '18' };
  protected nationality: { enabled: boolean; value: (typeof countryNames)[number] } = {
    enabled: false,
    value: '' as (typeof countryNames)[number],
  };
  protected excludedCountries: { enabled: boolean; value: (typeof countryNames)[number][] } = {
    enabled: false,
    value: [],
  };
  protected ofac: boolean = false;
  protected commitmentMerkleTreeUrl: string = '';

  constructor(devMode: boolean = false) {
    this.devMode = devMode;
    this.report = new OpenPassportVerifierReport();
  }

  public async verify(attestation: OpenPassportAttestation): Promise<OpenPassportVerifierReport> {
    const kScaled =
      attestation.proof.signatureAlgorithm === 'ecdsa'
        ? ECDSA_K_LENGTH_FACTOR * k_dsc_ecdsa
        : k_dsc;

    let parsedPublicSignals;
    if (attestation.proof.mode === 'vc_and_disclose') {
      parsedPublicSignals = parsePublicSignalsDisclose(attestation.proof.value.publicSignals);
    } else {
      parsedPublicSignals = parsePublicSignalsProve(attestation.proof.value.publicSignals, kScaled);
    }

    this.verifyAttribute('scope', castToScope(parsedPublicSignals.scope), this.scope);

    await this.verifyProof(
      attestation.proof.mode,
      attestation.proof.value.proof,
      attestation.proof.value.publicSignals,
      attestation.proof.signatureAlgorithm,
      attestation.proof.hashFunction
    );

    switch (attestation.proof.mode) {
      case 'register':
        await this.verifyRegister(attestation);
        break;
      case 'prove_onchain':
        await this.verifyProveOnChain(attestation);
        break;
      case 'prove_offchain':
        await this.verifyProveOffChain(attestation);
        break;
      case 'vc_and_disclose':
        await this.verifyDisclose(attestation);
        break;
    }
    return this.report;
  }

  private async verifyRegister(attestation: OpenPassportAttestation) {
    // verify dscProof
    await this.verifyDscProof(attestation);
    // verify that the blinded dscCommitments of proof and dscProof match
    this.verifyBlindedDscCommitments(attestation);
    // verify the root of the csca merkle tree
    this.verifyCSCARoot(attestation);
  }

  private async verifyProveOffChain(attestation: OpenPassportAttestation) {
    // verify disclose attributes
    this.verifyDiscloseAttributes(attestation);
    // verify certificate chain
    this.verifyCertificateChain(attestation);
  }

  private async verifyProveOnChain(attestation: OpenPassportAttestation) {
    // verify attributes
    this.verifyDiscloseAttributes(attestation);
    // verify the dsc proof
    await this.verifyDscProof(attestation);
    // verify that the blinded dscCommitments of proof and dscProof match
    this.verifyBlindedDscCommitments(attestation);
    // verify the root of the csca merkle tree
    this.verifyCSCARoot(attestation);
  }

  private async verifyDisclose(attestation: OpenPassportAttestation) {
    // verify the root of the commitment
    this.verifyCommitment(attestation);
    // verify disclose attributes
    this.verifyDiscloseAttributes(attestation);
  }

  private verifyDiscloseAttributes(attestation: OpenPassportAttestation) {
    let parsedPublicSignals;
    if (attestation.proof.mode === 'vc_and_disclose') {
      parsedPublicSignals = parsePublicSignalsDisclose(attestation.proof.value.publicSignals);
    } else {
      parsedPublicSignals = parsePublicSignalsProve(attestation.proof.value.publicSignals, k_dsc);
    }
    this.verifyAttribute(
      'current_date',
      parsedPublicSignals.current_date.toString(),
      getCurrentDateFormatted().toString()
    );

    const unpackedReveal = unpackReveal(parsedPublicSignals.revealedData_packed);
    if (this.minimumAge.enabled) {
      const attributeValueInt = getOlderThanFromCircuitOutput(parsedPublicSignals.older_than);
      const selfAttributeOlderThan = parseInt(this.minimumAge.value);
      if (attributeValueInt < selfAttributeOlderThan) {
        this.report.exposeAttribute(
          'older_than',
          attributeValueInt.toString(),
          this.minimumAge.value.toString()
        );
      } else {
        console.log('\x1b[32m%s\x1b[0m', '- minimum age verified');
      }
    }
    if (this.nationality.enabled) {
      if (this.nationality.value === 'Any') {
        console.log('\x1b[32m%s\x1b[0m', '- nationality verified');
      } else {
        const attributeValue = getAttributeFromUnpackedReveal(unpackedReveal, 'nationality');
        this.verifyAttribute('nationality', countryCodes[attributeValue], this.nationality.value);
      }
    }
    if (this.ofac) {
      const attributeValue = parsedPublicSignals.ofac_result.toString();
      this.verifyAttribute('ofac', attributeValue, '1');
    }
    if (this.excludedCountries.enabled) {
      const formattedCountryList = formatForbiddenCountriesListFromCircuitOutput(
        parsedPublicSignals.forbidden_countries_list_packed_disclosed
      );
      const formattedCountryListFullCountryNames = formattedCountryList.map(
        (countryCode) => countryCodes[countryCode]
      );
      this.verifyAttribute(
        'forbidden_countries_list',
        formattedCountryListFullCountryNames.toString(),
        this.excludedCountries.value.toString()
      );
    }
  }

  private verifyCSCARoot(attestation: OpenPassportAttestation) {
    // verify the root of the csca merkle tree
    const parsedDscPublicSignals = parsePublicSignalsDsc(attestation.dscProof.value.publicSignals);
    const cscaMerkleTreeFromDscProof = parsedDscPublicSignals.merkle_root;
    const cscaRoot = getCscaTreeRoot();
    this.verifyAttribute('merkle_root_csca', cscaRoot, cscaMerkleTreeFromDscProof);
  }

  private async verifyCommitment(attestation: OpenPassportAttestation) {
    const tree = await fetchTreeFromUrl(this.commitmentMerkleTreeUrl);
    const parsedPublicSignals = parsePublicSignalsDisclose(attestation.proof.value.publicSignals);
    this.verifyAttribute(
      'merkle_root_commitment',
      tree.root.toString(),
      parsedPublicSignals.merkle_root
    );
  }

  private verifyCertificateChain(attestation: OpenPassportAttestation) {
    const dscCertificate = forge.pki.certificateFromPem(attestation.dsc.value);
    const verified_certificate = verifyDSCValidity(dscCertificate, this.devMode);
    if (!verified_certificate) {
      this.report.exposeAttribute('dsc', attestation.dsc.value, 'certificate chain is not valid');
    } else {
      console.log('\x1b[32m%s\x1b[0m', '- certificate verified');
    }

    const parsedDsc = parseCertificateSimple(attestation.dsc.value);
    const signatureAlgorithmDsc = parsedDsc.signatureAlgorithm;
    if (signatureAlgorithmDsc === 'ecdsa') {
      throw new Error('ECDSA not supported yet');
    } else {
      const publicKeyDetails: PublicKeyDetailsRSA = parsedDsc.publicKeyDetails as PublicKeyDetailsRSA;
      const dscModulus = publicKeyDetails.modulus;
      const dscModulusBigInt = BigInt(`0x${dscModulus}`);
      const dscModulusWords = splitToWords(dscModulusBigInt, n_dsc, k_dsc);
      const pubKeyFromProof = parsePublicSignalsProve(
        attestation.proof.value.publicSignals,
        k_dsc
      ).pubKey_disclosed;

      const verified_modulus = areArraysEqual(dscModulusWords, pubKeyFromProof);
      if (!verified_modulus) {
        this.report.exposeAttribute(
          'pubKey',
          pubKeyFromProof,
          'pubKey from proof does not match pubKey from DSC certificate'
        );
      } else {
        console.log('\x1b[32m%s\x1b[0m', '- modulus verified');
      }
    }
  }

  private verifyBlindedDscCommitments(attestation: OpenPassportAttestation) {
    const parsedPublicSignals = parsePublicSignalsProve(
      attestation.proof.value.publicSignals,
      k_dsc
    );
    const proofBlindedDscCommitment = parsedPublicSignals.blinded_dsc_commitment;

    const parsedDscPublicSignals = parsePublicSignalsDsc(attestation.dscProof.value.publicSignals);
    const dscBlindedDscCommitment = parsedDscPublicSignals.blinded_dsc_commitment;

    this.verifyAttribute(
      'blinded_dsc_commitment',
      proofBlindedDscCommitment,
      dscBlindedDscCommitment
    );
  }

  private async verifyProof(
    mode: Mode,
    proof: string[],
    publicSignals: string[],
    signatureAlgorithm: string,
    hashFunction: string
  ): Promise<void> {
    const vkey = getVkeyFromArtifacts(mode, signatureAlgorithm, hashFunction);
    const isVerified = await groth16.verify(vkey, publicSignals, proof as any);
    this.verifyAttribute('proof', isVerified.toString(), 'true');
  }

  private async verifyDscProof(attestation: OpenPassportAttestation) {
    const dscSignatureAlgorithm = attestation.dscProof.signatureAlgorithm;
    const dscHashFunction = attestation.dscProof.hashFunction;
    const vkey = getVkeyFromArtifacts('dsc', dscSignatureAlgorithm, dscHashFunction);
    const isVerified = await groth16.verify(
      vkey,
      attestation.dscProof.value.publicSignals,
      attestation.dscProof.value.proof as any
    );
    this.verifyAttribute('dscProof', isVerified.toString(), 'true');
  }

  private verifyAttribute(
    attribute: keyof OpenPassportVerifierReport,
    value: string,
    expectedValue: string
  ) {
    if (value !== expectedValue) {
      this.report.exposeAttribute(attribute, value, expectedValue);
    } else {
      console.log('\x1b[32m%s\x1b[0m', `- attribute ${attribute} verified`);
    }
  }
}
