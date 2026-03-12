// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import type { VerificationRequest } from '@selfxyz/mobile-sdk-alpha';

export interface ParsedVerificationRequestContext {
  request: VerificationRequest;
  displayLabels: string[] | null;
  appName: string;
  appEndpoint: string;
  timestamp: number;
  requestType: string;
  verificationId?: string;
}

const ALLOWED_REQUEST_TYPES = new Set([
  'proofRequested',
  'documentOwnershipConfirmed',
]);
const DEFAULT_REQUEST_TYPE = 'proofRequested';

interface TargetOriginOptions {
  allowWildcard?: boolean;
}

export function parseVerificationRequestContext(
  search: string,
): ParsedVerificationRequestContext {
  const params = new URLSearchParams(search);
  const request: VerificationRequest = {
    userId: params.get('userId') ?? undefined,
    scope: params.get('scope') ?? undefined,
    disclosures: parseDisclosures(params),
  };

  const queryTimestamp = params.get('timestamp');
  const parsedTimestamp = queryTimestamp ? Number(queryTimestamp) : Number.NaN;

  return {
    request,
    displayLabels: parseDisplayLabels(params),
    appName: params.get('appName') ?? 'Verification',
    appEndpoint: normalizeAppEndpoint(params.get('appEndpoint')),
    timestamp: Number.isFinite(parsedTimestamp) ? parsedTimestamp : Date.now(),
    requestType: normalizeRequestType(params.get('resultType')),
    verificationId: params.get('verificationId') ?? undefined,
  };
}

export function parseBrowserHostTargetOrigin(
  search: string,
  options: TargetOriginOptions = {},
): string | undefined {
  const params = new URLSearchParams(search);
  return normalizeTargetOrigin(params.get('targetOrigin'), options);
}

function normalizeRequestType(value: string | null | undefined): string {
  if (!value) return DEFAULT_REQUEST_TYPE;
  return ALLOWED_REQUEST_TYPES.has(value) ? value : DEFAULT_REQUEST_TYPE;
}

function normalizeAppEndpoint(value: string | null | undefined): string {
  if (!value) return '';
  try {
    const endpoint = new URL(value);
    const isHttps = endpoint.protocol === 'https:';
    const isLocalHttp =
      endpoint.protocol === 'http:' &&
      (endpoint.hostname === 'localhost' || endpoint.hostname === '127.0.0.1');
    if (!isHttps && !isLocalHttp) return '';
    return endpoint.host;
  } catch {
    return '';
  }
}

function normalizeTargetOrigin(
  value: string | null | undefined,
  options: TargetOriginOptions = {},
): string | undefined {
  if (!value) return undefined;
  if (value === '*') {
    return options.allowWildcard ? '*' : undefined;
  }

  try {
    const origin = new URL(value);
    const isHttps = origin.protocol === 'https:';
    const isLocalHttp =
      origin.protocol === 'http:' &&
      (origin.hostname === 'localhost' || origin.hostname === '127.0.0.1');
    if (!isHttps && !isLocalHttp) {
      return undefined;
    }
    return origin.origin;
  } catch {
    return undefined;
  }
}

function splitCSV(value: string): string[] {
  return value.split(',').map((s) => s.trim()).filter(Boolean);
}

function parseDisclosures(params: URLSearchParams): string[] | undefined {
  const raw = params.get('disclosures');
  if (!raw) return undefined;
  const items = splitCSV(raw);
  return items.length > 0 ? items : undefined;
}

function parseDisplayLabels(params: URLSearchParams): string[] | null {
  const raw = params.get('proofItems');
  if (!raw) return null;
  const items = splitCSV(raw);
  return items.length > 0 ? items : null;
}
