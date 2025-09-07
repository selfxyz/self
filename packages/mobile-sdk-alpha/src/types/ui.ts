// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

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

// Screen component props
export interface ScreenProps {
  onSuccess: () => void;
  onFailure: (error: Error) => void;
}

export interface PassportCameraProps {
  onMRZDetected: (mrzData: MRZInfo) => void;
}
