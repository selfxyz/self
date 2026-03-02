import type { CertificateData } from '../foundation/types/certificate.js';
import type { DocumentCategory, DocumentType, IDDocument } from '../foundation/types/document.js';

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
 * Polymorphic document interface — wraps PassportData, AadhaarData, or KycData
 * in a uniform behavioral API. Raw data stays serializable; this adapter adds
 * accessor methods that eliminate if/else branching across consumers.
 */
export interface IDocument {
  readonly category: DocumentCategory;
  readonly type: DocumentType;
  readonly raw: IDDocument;
  readonly isMock: boolean;

  // Generic typed accessor for any standard attribute
  getAttribute(name: DocumentAttribute): string | null;

  // Behavioral methods that differ meaningfully per doc type
  isExpired(): boolean;
  getContentHash(): string;
  getAttestationId(): string;

  // Parsed certificates (MRZ docs only, undefined for aadhaar/kyc)
  getDscParsed(): CertificateData | undefined;
  getCscaParsed(): CertificateData | undefined;

  // Circuit name resolution — each doc type encodes its own naming convention
  getRegisterCircuitName(): string;
  getDscCircuitName(): string;

  // Commitment and nullifier generation
  generateCommitment(secret: string): string;
  generateNullifier(): string;

  // Disclosure helpers — handle attribute position differences per doc type
  getAttributePositions(): Record<string, number[]>;
  getRevealBitmap(disclosures: Record<string, boolean>): number[];
  getDisclosureSlice(attribute: string): string;

  // Maps unified DisclosureField names to document-specific selector format.
  // Passport returns { selectorDg1, selectorOlderThan, selectorOfac }.
  // Aadhaar returns a formatted selector string.
  buildDisclosureSelector(fields: DisclosureField[]): unknown;
}
