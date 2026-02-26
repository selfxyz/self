import { sha256 } from 'js-sha256';

import type { CertificateData } from '../../foundation/types/certificate.js';
import type {
  AadhaarData,
  DocumentCategory,
  DocumentType,
} from '../../foundation/types/document.js';
import { AADHAAR_ATTESTATION_ID } from '../../foundation/constants/identity.js';
import type { DocumentAttribute, IDocument } from '../interface.js';

export class AadhaarDocument implements IDocument {
  readonly category: DocumentCategory = 'aadhaar';
  readonly type: DocumentType;
  readonly raw: AadhaarData;
  readonly isMock: boolean;

  constructor(data: AadhaarData) {
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
}
