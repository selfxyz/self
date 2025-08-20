import type { DocumentCategory, PassportData } from '@selfxyz/common';

import type { MRZInfo } from './public';

// Document-related types
/**
 * Document metadata - must NOT contain plaintext MRZ/PII
 * All sensitive payloads belong only in DocumentData.data (typed as PassportData)
 * or in encrypted storage referenced by the opaque token
 */
export interface DocumentMetadata {
  id: string;
  documentType: string;
  documentCategory: DocumentCategory;
  encryptedBlobRef?: string; // opaque pointer; no plaintext PII
  mock: boolean;
  isRegistered?: boolean;
}

export interface DocumentData {
  data: PassportData;
  metadata: DocumentMetadata;
}

// External adapter interface
export interface ExternalAdapter {
  getSecret: () => Promise<string>;
  getAllDocuments: () => Promise<{
    [documentId: string]: DocumentData;
  }>;
  setDocument: (doc: DocumentData, documentId: string) => Promise<boolean>;
  onOnboardingSuccess: () => void;
  onOnboardingFailure: (error: Error) => void;
  onDisclosureSuccess: () => void;
  onDisclosureFailure: (error: Error) => void;
}

// Screen component props
export interface ScreenProps {
  onSuccess: () => void;
  onFailure: (error: Error) => void;
}

export interface PassportCameraProps {
  onMRZDetected: (mrzData: MRZInfo) => void;
}
