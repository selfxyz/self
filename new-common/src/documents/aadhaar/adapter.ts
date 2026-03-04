import forge from 'node-forge';
import { sha256 } from 'js-sha256';
import { poseidon5 } from 'poseidon-lite';

import type { CertificateData } from '../../foundation/types/certificate.js';
import type {
  AadhaarData,
  DeployedCircuits,
  DocumentCategory,
  DocumentType,
} from '../../foundation/types/document.js';
import { AADHAAR_ATTESTATION_ID } from '../../foundation/constants/identity.js';
import { packBytesAndPoseidon } from '../../crypto/hash/poseidon.js';
import type { CircuitType, DisclosureField, DocumentAttribute } from '../interface.js';
import { IDocument } from '../interface.js';
import { disclosureToAadhaarSelector } from './constants.js';
import { processQRData } from './qr.js';
import { stringToAsciiArray } from './utils.js';

export class AadhaarDocument extends IDocument {
  readonly category: DocumentCategory = 'aadhaar';
  readonly type: DocumentType;
  readonly raw: AadhaarData;
  readonly isMock: boolean;

  constructor(data: AadhaarData) {
    super();
    this.raw = data;
    this.type = data.documentType;
    this.isMock = data.mock;
  }

  getAttribute(name: DocumentAttribute): string | null {
    switch (name) {
      case 'name':
        return this.raw.extractedFields.name ?? null;
      case 'date_of_birth': {
        // extractedFields has separate yob/mob/dob fields — combine to YYMMDD
        const { yob, mob, dob } = this.raw.extractedFields;
        if (!yob || !mob || !dob) return null;
        return yob.slice(-2) + mob.padStart(2, '0') + dob.padStart(2, '0');
      }
      case 'nationality':
        return 'IND'; // Aadhaar is India-only
      case 'document_number':
        return this.raw.extractedFields.aadhaarLast4Digits ?? null;
      case 'gender':
        return this.raw.extractedFields.gender ?? null;
      case 'expiry_date':
        return null; // Aadhaar does not expire
      case 'issuing_state':
        return 'IND';
    }
  }

  isExpired(): boolean {
    return false; // Aadhaar does not expire
  }

  getContentHash(): string {
    const stableData = {
      documentType: this.raw.documentType,
      data: this.raw.qrData,
      documentCategory: this.raw.documentCategory,
    };
    return sha256(JSON.stringify(stableData));
  }

  getAttestationId(): string {
    return AADHAAR_ATTESTATION_ID;
  }

  getDscParsed(): CertificateData | undefined {
    return undefined;
  }

  getCscaParsed(): CertificateData | undefined {
    return undefined;
  }

  getDnsMappingKey(circuitType: CircuitType): string {
    switch (circuitType) {
      case 'disclose':
        return 'DISCLOSE_AADHAAR';
      case 'register':
        return 'REGISTER_AADHAAR';
      case 'dsc':
        throw new Error('Aadhaar does not have a DSC circuit');
    }
  }

  getRegisterCircuitName(): string {
    return 'register_aadhaar';
  }

  generateCommitment(secret: string): string {
    const fields = this.raw.extractedFields;
    const processed = processQRData(this.raw.qrData);

    const nullifier = this.computeNullifier(fields);
    const packedCommitment = this.computePackedCommitment(fields);

    return poseidon5([
      BigInt(secret),
      processed.qrHash,
      nullifier,
      packedCommitment,
      processed.photoHash,
    ]).toString();
  }

  generateNullifier(): string {
    return this.computeNullifier(this.raw.extractedFields).toString();
  }

  private computeNullifier(fields: AadhaarData['extractedFields']): bigint {
    const genderAscii = stringToAsciiArray(fields.gender)[0];
    const args = [
      genderAscii,
      ...stringToAsciiArray(fields.yob),
      ...stringToAsciiArray(fields.mob),
      ...stringToAsciiArray(fields.dob),
      ...stringToAsciiArray(fields.name.toUpperCase().padEnd(62, '\0')),
      ...stringToAsciiArray(fields.aadhaarLast4Digits),
    ];
    return BigInt(packBytesAndPoseidon(args));
  }

  private computePackedCommitment(fields: AadhaarData['extractedFields']): bigint {
    const args = [
      3,
      ...stringToAsciiArray(fields.pincode),
      ...stringToAsciiArray(fields.state.padEnd(31, '\0')),
      ...stringToAsciiArray(fields.phoneNoLast4Digits),
      ...stringToAsciiArray(fields.name.padEnd(62, '\0')),
    ];
    return BigInt(packBytesAndPoseidon(args));
  }

  getPubKeyModulus(): bigint {
    const pem = this.raw.publicKey;
    if (pem.includes('BEGIN CERTIFICATE')) {
      const cert = forge.pki.certificateFromPem(pem);
      return BigInt('0x' + (cert.publicKey as forge.pki.rsa.PublicKey).n.toString(16));
    }
    const pubKey = forge.pki.publicKeyFromPem(pem);
    return BigInt('0x' + (pubKey as forge.pki.rsa.PublicKey).n.toString(16));
  }

  getSignatureBigInt(): bigint {
    const hex = Buffer.from(new Uint8Array(this.raw.signature)).toString('hex');
    return BigInt('0x' + hex);
  }

  getDscCircuitName(): string {
    throw new Error('Aadhaar does not have a DSC circuit');
  }

  getAttributePositions(): Record<string, number[]> {
    // Aadhaar doesn't use MRZ byte positions — field extraction
    // is handled via extractedFields. Return empty map; disclosure
    // is managed through selector bits in aadhaar/constants.ts (Task 9).
    return {};
  }

  getRevealBitmap(disclosures: Record<string, boolean>): number[] {
    // Aadhaar-specific bitmap — full implementation in aadhaar/constants.ts (Task 9)
    return Object.entries(disclosures)
      .filter(([_, disclosed]) => disclosed)
      .map(([_, __], i) => i);
  }

  getDisclosureSlice(attribute: string): string {
    const key = attribute as keyof typeof this.raw.extractedFields;
    return this.raw.extractedFields[key] ?? '';
  }

  isValidRegisterCircuit(deployedCircuits: DeployedCircuits): { isValid: boolean; circuitName: string | null } {
    const circuitName = this.getRegisterCircuitName();
    const isValid = deployedCircuits.REGISTER_AADHAAR.includes(circuitName);
    return { isValid, circuitName };
  }

  isValidDscCircuit(_deployedCircuits: DeployedCircuits): { isValid: boolean; circuitName: string | null } {
    return { isValid: false, circuitName: null };
  }

  buildDisclosureSelector(fields: DisclosureField[]): unknown {
    return disclosureToAadhaarSelector(fields);
  }
}
