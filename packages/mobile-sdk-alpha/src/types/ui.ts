import type { DocumentCategory, PassportData } from '@selfxyz/common';

// Document-related types
export interface DocumentMetadata {
  id: string;
  documentType: string;
  documentCategory: DocumentCategory;
  data: string;
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
  onMRZDetected: (mrzData: any) => void;
}
