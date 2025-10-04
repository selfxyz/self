// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import type { DocumentMetadata } from '@selfxyz/common/utils/types';

export function humanizeDocumentType(documentType: string): string {
  const toTitle = (s: string) => s.replace(/_/g, ' ').replace(/\b\w/g, char => char.toUpperCase());

  if (documentType.startsWith('mock_')) {
    const base = documentType.replace('mock_', '');
    return `Mock ${toTitle(base)}`;
  }

  return toTitle(documentType);
}

export function formatDataPreview(metadata: DocumentMetadata): string {
  const data = metadata.data;
  if (!data) return 'No preview available';

  const lines = data.split(/\r?\n/).filter(Boolean);
  const preview = lines.slice(0, 2).join('\n');

  const MAX_LENGTH = 120;
  if (preview.length > MAX_LENGTH) {
    return `${preview.slice(0, MAX_LENGTH - 1)}…`;
  }

  return preview;
}

export function maskId(id: string): string {
  if (id.length <= 8) return id;
  const prefix = id.slice(0, 8);
  const remaining = id.length - 8;
  const suffixLen = Math.min(6, remaining);
  const suffix = id.slice(-suffixLen);
  return `${prefix}…${suffix}`;
}
