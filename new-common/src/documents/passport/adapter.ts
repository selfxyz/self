import { sha256 } from 'js-sha256';

import type { CertificateData } from '../../foundation/types/certificate.js';
import type {
  DeployedCircuits,
  DocumentCategory,
  DocumentType,
  PassportData,
} from '../../foundation/types/document.js';
import {
  PASSPORT_ATTESTATION_ID,
  ID_CARD_ATTESTATION_ID,
} from '../../foundation/constants/identity.js';
import {
  attributeToPosition,
  attributeToPosition_ID,
  disclosureToPassportSelectors,
  revealedDataTypes,
  type PassportDisclosureSelector,
} from '../../foundation/constants/disclosure.js';
import { getCurrentDateYYMMDD } from '../../foundation/date.js';
import type { CircuitType, DisclosureField, DocumentAttribute } from '../interface.js';
import { IDocument } from '../interface.js';
import {
  generateCommitment as commitmentFn,
  generateNullifier as nullifierFn,
} from './commitment.js';

export class PassportDocument extends IDocument {
  readonly category: DocumentCategory;
  readonly type: DocumentType;
  readonly raw: PassportData;
  readonly isMock: boolean;

  constructor(data: PassportData) {
    super();
    this.raw = data;
    this.category = data.documentCategory;
    this.type = data.documentType;
    this.isMock = data.mock;
  }

  getAttribute(name: DocumentAttribute): string | null {
    const positions = this.getAttributePositions();
    switch (name) {
      case 'name': {
        const [start, end] = positions.name;
        return this.raw.mrz
          .substring(start, end + 1)
          .replace(/</g, ' ')
          .trim();
      }
      case 'date_of_birth': {
        const [start, end] = positions.date_of_birth;
        return this.raw.mrz.substring(start, end + 1);
      }
      case 'nationality': {
        const [start, end] = positions.nationality;
        return this.raw.mrz.substring(start, end + 1).replace(/</g, '');
      }
      case 'document_number': {
        const [start, end] = positions.passport_number;
        return this.raw.mrz.substring(start, end + 1).replace(/</g, '');
      }
      case 'gender': {
        const [start, end] = positions.gender;
        return this.raw.mrz.substring(start, end + 1);
      }
      case 'expiry_date': {
        const [start, end] = positions.expiry_date;
        return this.raw.mrz.substring(start, end + 1);
      }
      case 'issuing_state': {
        const [start, end] = positions.issuing_state;
        return this.raw.mrz.substring(start, end + 1).replace(/</g, '');
      }
    }
  }

  isExpired(): boolean {
    const expiry = this.getAttribute('expiry_date');
    if (!expiry) return false;
    const now = getCurrentDateYYMMDD();
    const nowStr = now.map(String).join('');
    return expiry < nowStr;
  }

  getContentHash(): string {
    if (this.raw.eContent) {
      const eContentStr =
        typeof this.raw.eContent === 'string'
          ? this.raw.eContent
          : JSON.stringify(this.raw.eContent);
      return sha256(eContentStr);
    }
    const stableData = {
      documentType: this.raw.documentType,
      data: this.raw.mrz,
      documentCategory: this.raw.documentCategory,
    };
    return sha256(JSON.stringify(stableData));
  }

  getAttestationId(): string {
    return this.category === 'id_card' ? ID_CARD_ATTESTATION_ID : PASSPORT_ATTESTATION_ID;
  }

  getDscParsed(): CertificateData | undefined {
    return this.raw.dsc_parsed;
  }

  getCscaParsed(): CertificateData | undefined {
    return this.raw.csca_parsed;
  }

  getDnsMappingKey(circuitType: CircuitType): string {
    switch (circuitType) {
      case 'disclose':
        return this.category === 'id_card' ? 'DISCLOSE_ID' : 'DISCLOSE';
      case 'register':
        return this.category === 'id_card' ? 'REGISTER_ID' : 'REGISTER';
      case 'dsc':
        return this.category === 'id_card' ? 'DSC_ID' : 'DSC';
    }
  }

  getRegisterCircuitName(): string {
    const meta = this.raw.passportMetadata;
    if (!meta) throw new Error('Passport data are not parsed');
    if (!meta.cscaFound) throw new Error('CSCA not found');

    const prefix =
      this.type === 'id_card' || this.type === 'mock_id_card' ? 'register_id' : 'register';

    const { dg1HashFunction, eContentHashFunction, signedAttrHashFunction, signatureAlgorithm } =
      meta;

    if (signatureAlgorithm === 'ecdsa') {
      return `${prefix}_${dg1HashFunction}_${eContentHashFunction}_${signedAttrHashFunction}_${signatureAlgorithm}_${meta.curveOrExponent}`;
    } else if (signatureAlgorithm === 'rsa') {
      if (meta.signatureAlgorithmBits > 4096)
        throw new Error(`Unsupported key length: ${meta.signatureAlgorithmBits}`);
      return `${prefix}_${dg1HashFunction}_${eContentHashFunction}_${signedAttrHashFunction}_${signatureAlgorithm}_${meta.curveOrExponent}_${4096}`;
    } else if (signatureAlgorithm === 'rsapss') {
      if (meta.signatureAlgorithmBits > 4096)
        throw new Error(`Unsupported key length: ${meta.signatureAlgorithmBits}`);
      return `${prefix}_${dg1HashFunction}_${eContentHashFunction}_${signedAttrHashFunction}_${signatureAlgorithm}_${meta.curveOrExponent}_${meta.saltLength}_${meta.signatureAlgorithmBits}`;
    }
    throw new Error(`Unsupported signature algorithm: ${signatureAlgorithm}`);
  }

  generateCommitment(secret: string): string {
    return commitmentFn(secret, this.getAttestationId(), this.raw);
  }

  generateNullifier(): string {
    return nullifierFn(this.raw);
  }

  getDscCircuitName(): string {
    const meta = this.raw.passportMetadata;
    if (!meta) throw new Error('Passport data are not parsed');
    if (!meta.cscaFound) throw new Error('CSCA not found');

    const { cscaSignatureAlgorithm, cscaHashFunction } = meta;

    if (cscaSignatureAlgorithm === 'ecdsa') {
      return `dsc_${cscaHashFunction}_${cscaSignatureAlgorithm}_${meta.cscaCurveOrExponent}`;
    } else if (cscaSignatureAlgorithm === 'rsa') {
      if (meta.cscaSignatureAlgorithmBits > 4096)
        throw new Error(`Unsupported key length: ${meta.cscaSignatureAlgorithmBits}`);
      return `dsc_${cscaHashFunction}_${cscaSignatureAlgorithm}_${meta.cscaCurveOrExponent}_${4096}`;
    } else if (cscaSignatureAlgorithm === 'rsapss') {
      if (meta.cscaSignatureAlgorithmBits > 4096)
        throw new Error(`Unsupported key length: ${meta.cscaSignatureAlgorithmBits}`);
      return `dsc_${cscaHashFunction}_${cscaSignatureAlgorithm}_${meta.cscaCurveOrExponent}_${meta.cscaSaltLength}_${meta.cscaSignatureAlgorithmBits}`;
    }
    throw new Error(`Unsupported signature algorithm: ${cscaSignatureAlgorithm}`);
  }

  getAttributePositions(): Record<string, number[]> {
    return this.category === 'id_card'
      ? (attributeToPosition_ID as Record<string, number[]>)
      : (attributeToPosition as Record<string, number[]>);
  }

  getRevealBitmap(disclosures: Record<string, boolean>): number[] {
    return Object.entries(disclosures)
      .filter(([_, disclosed]) => disclosed)
      .map(([attr]) => (revealedDataTypes as Record<string, number>)[attr])
      .filter((idx): idx is number => idx !== undefined);
  }

  getDisclosureSlice(attribute: string): string {
    const positions = this.getAttributePositions();
    const pos = positions[attribute];
    if (!pos) return '';
    const [start, end] = pos;
    return this.raw.mrz.substring(start, end + 1);
  }

  isValidRegisterCircuit(deployedCircuits: DeployedCircuits): { isValid: boolean; circuitName: string | null } {
    try {
      const circuitName = this.getRegisterCircuitName();
      const isValid =
        deployedCircuits.REGISTER.includes(circuitName) ||
        deployedCircuits.REGISTER_ID.includes(circuitName);
      return { isValid, circuitName };
    } catch {
      return { isValid: false, circuitName: null };
    }
  }

  isValidDscCircuit(deployedCircuits: DeployedCircuits): { isValid: boolean; circuitName: string | null } {
    try {
      const circuitName = this.getDscCircuitName();
      const isValid =
        deployedCircuits.DSC.includes(circuitName) ||
        deployedCircuits.DSC_ID.includes(circuitName);
      return { isValid, circuitName };
    } catch {
      return { isValid: false, circuitName: null };
    }
  }

  buildDisclosureSelector(fields: DisclosureField[]): PassportDisclosureSelector {
    const idType = this.category === 'id_card' ? 'id' : 'passport';
    return disclosureToPassportSelectors(fields, idType);
  }
}
