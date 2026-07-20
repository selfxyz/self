// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import type { Capabilities } from '@selfxyz/webview-bridge';

export type { Capabilities };

// Backward compat: a host that does not advertise capabilities (pre-handshake)
// is treated as fully capable so pre-existing flows are unchanged.
export const ALL_CAPABILITIES: Capabilities = {
  nfc: true,
  mrzCamera: true,
  biometrics: true,
  secureStorage: true,
};

// Native capabilities each onboarding document type depends on. Types absent
// from this map (Aadhaar, KYC/other-IDs disclosed against existing documents)
// require no optional native module and stay reachable regardless.
const DOCUMENT_CAPABILITY_REQUIREMENTS: Record<string, (keyof Capabilities)[]> = {
  // IDSelection ids
  p: ['nfc'],
  i: ['nfc', 'mrzCamera'],
  // verification-request / route document type strings
  passport: ['nfc'],
  id_card: ['nfc', 'mrzCamera'],
};

export function normalizeCapabilities(
  raw: Partial<Capabilities> | null | undefined,
): Capabilities {
  if (!raw) return ALL_CAPABILITIES;
  return {
    nfc: raw.nfc ?? true,
    mrzCamera: raw.mrzCamera ?? true,
    biometrics: raw.biometrics ?? true,
    secureStorage: raw.secureStorage ?? true,
  };
}

export function isDocumentTypeAvailable(
  documentType: string,
  capabilities: Capabilities,
): boolean {
  const required = DOCUMENT_CAPABILITY_REQUIREMENTS[documentType] ?? [];
  return required.every(capability => capabilities[capability]);
}

// Document types an inbound verification request will accept, if it constrains
// them. Supports a single `documentType` string or `documentTypes`/`ids` arrays.
function requestedDocumentTypes(
  request: Record<string, unknown> | null | undefined,
): string[] {
  if (!request) return [];
  const collected: string[] = [];
  if (typeof request.documentType === 'string') collected.push(request.documentType);
  for (const field of ['documentTypes', 'ids'] as const) {
    const value = request[field];
    if (Array.isArray(value)) {
      for (const entry of value) {
        if (typeof entry === 'string') collected.push(entry);
      }
    }
  }
  return collected;
}

// True only when the request constrains document types AND every accepted type
// needs a capability that is unavailable. An unconstrained request is treated as
// satisfiable (the per-call NOT_AVAILABLE rejection remains the runtime backstop).
export function requestRequiresUnavailableCapability(
  request: Record<string, unknown> | null | undefined,
  capabilities: Capabilities,
): boolean {
  const documentTypes = requestedDocumentTypes(request);
  if (documentTypes.length === 0) return false;
  return documentTypes.every(
    documentType => !isDocumentTypeAvailable(documentType, capabilities),
  );
}
