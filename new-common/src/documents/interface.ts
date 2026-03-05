import type { CertificateData } from '../foundation/types/certificate.js';
import type { DeployedCircuits, DocumentCategory, DocumentType, IDDocument } from '../foundation/types/document.js';

export type CircuitType = 'disclose' | 'register' | 'dsc';

export type DocumentAttribute =
  | 'name'
  | 'date_of_birth'
  | 'nationality'
  | 'document_number'
  | 'gender'
  | 'expiry_date'
  | 'issuing_state';

/**
 * Unified disclosure field vocabulary used across all document types.
 * Each document adapter maps these abstract names to its internal
 * selector format (e.g. MRZ byte bitmaps for passport, selector bits for aadhaar).
 */
export type DisclosureField =
  | 'name'
  | 'gender'
  | 'date_of_birth'
  | 'nationality'
  | 'id_number'
  | 'issuing_state'
  | 'expiry_date'
  | 'ofac'
  | 'older_than';

/**
 * Polymorphic document base — wraps PassportData, AadhaarData, or KycData
 * in a uniform behavioral API. Raw data stays serializable; this adapter adds
 * accessor methods that eliminate if/else branching across consumers.
 *
 * Abstract class instead of interface so shared derived methods (like
 * getAttestationIdHex) are defined once.
 */
export abstract class IDocument {
  abstract readonly category: DocumentCategory;
  abstract readonly type: DocumentType;
  abstract readonly raw: IDDocument;
  abstract readonly isMock: boolean;

  abstract getAttribute(name: DocumentAttribute): string | null;

  abstract isExpired(): boolean;
  abstract getContentHash(): string;
  abstract getAttestationId(): string;

  getAttestationIdHex(): string {
    return '0x' + BigInt(this.getAttestationId()).toString(16).padStart(64, '0');
  }

  abstract getDscParsed(): CertificateData | undefined;
  abstract getCscaParsed(): CertificateData | undefined;

  abstract getRegisterCircuitName(): string;
  abstract getDscCircuitName(): string;

  getDiscloseCircuitName(): string {
    const category: DocumentCategory = this.category;
    switch (category) {
      case 'passport':
        return 'vc_and_disclose';
      case 'id_card':
        return 'vc_and_disclose_id';
      case 'aadhaar':
        return 'vc_and_disclose_aadhaar';
      case 'kyc':
        return 'vc_and_disclose_kyc';
      default: {
        const _exhaustive: never = category;
        throw new Error(`Unsupported document category: ${_exhaustive}`);
      }
    }
  }

  /** Returns the document-type suffix used in circuit/key names (e.g. '' for passport, '_id' for id_card). */
  getDocumentExtension(): string {
    const category: DocumentCategory = this.category;
    switch (category) {
      case 'passport':
        return '';
      case 'id_card':
        return '_id';
      case 'aadhaar':
        return '_aadhaar';
      case 'kyc':
        return '_kyc';
      default: {
        const _exhaustive: never = category;
        throw new Error(`Unsupported document category: ${_exhaustive}`);
      }
    }
  }

  getInternalDnsMappingKey(): string {
    const category: DocumentCategory = this.category;
    switch (category) {
      case 'passport':
        return 'disclose';
      case 'id_card':
        return 'disclose';
      case 'aadhaar':
        return 'disclose_aadhaar';
      case 'kyc':
        return 'disclose_kyc';
      default: {
        const _exhaustive: never = category;
        throw new Error(`Unsupported document category: ${_exhaustive}`);
      }
    }
  }

  /** Returns the key used to look up this document's circuit in `circuits_dns_mapping`. */
  abstract getDnsMappingKey(circuitType: CircuitType): string;

  abstract isValidRegisterCircuit(deployedCircuits: DeployedCircuits): { isValid: boolean; circuitName: string | null };
  abstract isValidDscCircuit(deployedCircuits: DeployedCircuits): { isValid: boolean; circuitName: string | null };

  abstract generateCommitment(secret: string): string;
  abstract generateNullifier(): string;

  abstract getAttributePositions(): Record<string, number[]>;
  abstract getRevealBitmap(disclosures: Record<string, boolean>): number[];
  abstract getDisclosureSlice(attribute: string): string;

  abstract buildDisclosureSelector(fields: DisclosureField[]): unknown;
}
