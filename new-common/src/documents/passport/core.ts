import type { hashAlgos } from '../../foundation/constants/crypto.js';
import type { DocumentCategory, DocumentType } from '../../foundation/types/document.js';
import { shaPad, sha384_512Pad } from '../../crypto/sha-pad.js';

export function pad(hashFunction: (typeof hashAlgos)[number]) {
  return hashFunction === 'sha1' || hashFunction === 'sha224' || hashFunction === 'sha256'
    ? shaPad
    : sha384_512Pad;
}

export function padWithZeroes(bytes: number[], length: number) {
  return bytes.concat(new Array(length - bytes.length).fill(0));
}

export function inferDocumentCategory(documentType: DocumentType): DocumentCategory {
  switch (documentType) {
    case 'passport':
    case 'mock_passport':
      return 'passport';
    case 'id_card':
    case 'mock_id_card':
      return 'id_card';
    case 'aadhaar':
    case 'mock_aadhaar':
      return 'aadhaar';
  }
}
