import {
  type IDDocument,
  isAadhaarDocument,
  isKycDocument,
  isMRZDocument,
} from '../foundation/types/document.js';
import type { IDocument } from './interface.js';
import { PassportDocument } from './passport/adapter.js';
import { AadhaarDocument } from './aadhaar/adapter.js';
import { KycDocument } from './kyc/adapter.js';
import { inferDocumentCategory } from './passport/core.js';

export function createDocument(data: IDDocument): IDocument {
  // If documentCategory is missing, infer it from documentType
  if (!data.documentCategory && data.documentType) {
    data = { ...data, documentCategory: inferDocumentCategory(data.documentType) } as IDDocument;
  }
  if (isMRZDocument(data)) return new PassportDocument(data);
  if (isAadhaarDocument(data)) return new AadhaarDocument(data);
  if (isKycDocument(data)) return new KycDocument(data);
  const _exhaustive: never = data;
  throw new Error(`Unsupported document category: ${(_exhaustive as IDDocument).documentCategory}`);
}
