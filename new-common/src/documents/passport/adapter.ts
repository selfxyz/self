import { sha256 } from 'js-sha256';

import type { CertificateData } from '../../foundation/types/certificate.js';
import type {
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
  revealedDataTypes,
} from '../../foundation/constants/disclosure.js';
import { getCurrentDateYYMMDD } from '../../foundation/date.js';
import type { DocumentAttribute, IDocument } from '../interface.js';

export class PassportDocument implements IDocument {
  readonly category: DocumentCategory;
  readonly type: DocumentType;
  readonly raw: PassportData;
  readonly isMock: boolean;

  constructor(data: PassportData) {
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
        return this.raw.mrz.substring(start, end + 1).replace(/</g, ' ').trim();
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
}
