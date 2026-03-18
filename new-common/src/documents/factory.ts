import type { IDDocument } from '../foundation/types/document.js';
import type { IDocument } from './interface.js';
import { PassportDocument } from './passport/adapter.js';
import { AadhaarDocument } from './aadhaar/adapter.js';
import { KycDocument } from './kyc/adapter.js';

export function createDocument(data: IDDocument): IDocument {
  switch (data.documentCategory) {
    case 'passport':
    case 'id_card':
      return new PassportDocument(data);
    case 'aadhaar':
      return new AadhaarDocument(data);
    case 'kyc':
      return new KycDocument(data);
  }
}
