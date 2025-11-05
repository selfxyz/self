// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import type { DocumentCategory, PassportData } from '@selfxyz/common';

import type { MRZInfo } from './public';

// Document-related types
/**
 * Metadata describing a stored document. Never embed MRZ or other plaintext PII
 * here; keep sensitive payloads within {@link DocumentData.data} or in
 * encrypted blobs referenced by `encryptedBlobRef`.
 */
export interface DocumentMetadata {
  id: string;
  documentType: string;
  documentCategory: DocumentCategory;
  encryptedBlobRef?: string; // opaque pointer; no plaintext PII
  mock: boolean;
  isRegistered?: boolean;
  registeredAt?: number; // timestamp (epoch ms) when document was registered
}

/**
 * Combined document payload returned to UI flows. `data` carries the raw
 * passport response while `metadata` reflects state persisted in the
 * {@link DocumentsAdapter}. Consumers must treat `data` as sensitive and avoid
 * serialising it to logs or analytics events.
 */
export interface DocumentData {
  data: PassportData;
  metadata: DocumentMetadata;
}

// Screen component props
/**
 * Standard callbacks injected into onboarding screens. `onSuccess` is called
 * once the flow captured everything required to move forward; `onFailure`
 * receives the original error so hosts can map to their telemetry systems.
 */
export interface ScreenProps {
  onSuccess: () => void;
  onFailure: (error: Error) => void;
}

/**
 * Props consumed by the camera component that performs MRZ OCR. The handler is
 * invoked after the SDK validates checksum integrity but before any NFC work
 * starts, giving hosts a chance to surface confirmation UI.
 */
export interface PassportCameraProps {
  onMRZDetected: (mrzData: MRZInfo) => void;
}
