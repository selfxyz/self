// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

/**
 * Gets the document type display name for the proof request message.
 */
export function getDocumentTypeName(category: string | undefined): string {
  switch (category) {
    case 'passport':
      return 'Passport';
    case 'id_card':
      return 'ID Card';
    case 'aadhaar':
      return 'Aadhaar';
    default:
      return 'Document';
  }
}
