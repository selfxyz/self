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
  environment: 'prod' | 'stg';
  version: number;
  excludedCountries: string[];
  endpointType?: string;
  userIdType?: string;
  chainID?: number;
  userDefinedData?: string;
  selfDefinedData?: string;
}

const ALLOWED_REQUEST_TYPES = new Set(['proofRequested', 'documentOwnershipConfirmed']);
const DEFAULT_REQUEST_TYPE = 'proofRequested';

interface TargetOriginOptions {
  allowWildcard?: boolean;
}

export function hasDiscloseRequestContext(
  context: Pick<ParsedVerificationRequestContext, 'request' | 'displayLabels'>,
) {
  return Boolean((context.displayLabels && context.displayLabels.length > 0) || context.request.disclosures?.length);
}

export function parseBrowserHostTargetOrigin(search: string, options: TargetOriginOptions = {}): string | undefined {
  const params = new URLSearchParams(search);
  return normalizeTargetOrigin(params.get('targetOrigin'), options);
}

export function parseVerificationRequestContext(search: string): ParsedVerificationRequestContext {
  const params = new URLSearchParams(search);
  const request: VerificationRequest = {
    userId: params.get('userId') ?? undefined,
    scope: params.get('scope') ?? undefined,
    disclosures: parseDisclosures(params),
  };

  const queryTimestamp = params.get('timestamp');
  const parsedTimestamp = queryTimestamp ? Number(queryTimestamp) : Number.NaN;

  const rawEnv = params.get('environment');
  const environment: 'prod' | 'stg' = rawEnv === 'staging' || rawEnv === 'stg' ? 'stg' : 'prod';

  const rawVersion = params.get('version');
  const parsedVersion = rawVersion ? Number(rawVersion) : Number.NaN;
  const version = Number.isFinite(parsedVersion) ? parsedVersion : 1;

  const endpointType = params.get('endpointType') ?? undefined;
  const userIdType = params.get('userIdType') ?? undefined;
  const rawChainID = params.get('chainID');
  const parsedChainID = rawChainID ? parseInt(rawChainID, 10) : Number.NaN;
  const chainID = Number.isFinite(parsedChainID) ? parsedChainID : undefined;
  const userDefinedData = params.get('userDefinedData') ?? undefined;
  const selfDefinedData = params.get('selfDefinedData') ?? undefined;

  return {
    request,
    displayLabels: parseDisplayLabels(params),
    appName: params.get('appName') ?? 'Verification',
    appEndpoint: normalizeEndpoint(params.get('appEndpoint'), endpointType),
    timestamp: Number.isFinite(parsedTimestamp) ? parsedTimestamp : Date.now(),
    requestType: normalizeRequestType(params.get('resultType')),
    verificationId: params.get('verificationId') ?? undefined,
    environment,
    version,
    excludedCountries: parseExcludedCountries(params),
    endpointType,
    userIdType,
    chainID,
    userDefinedData,
    selfDefinedData,
  };
}

function normalizeRequestType(value: string | null | undefined): string {
  if (!value) return DEFAULT_REQUEST_TYPE;
  return ALLOWED_REQUEST_TYPES.has(value) ? value : DEFAULT_REQUEST_TYPE;
}

function normalizeEndpoint(value: string | null | undefined, endpointType?: string): string {
  if (!value) return '';

  if (endpointType === 'celo' || endpointType === 'staging_celo') {
    return value.startsWith('0x') ? value : '';
  }

  try {
    const endpoint = new URL(value);
    const isHttps = endpoint.protocol === 'https:';
    const isLocalHttp =
      endpoint.protocol === 'http:' && (endpoint.hostname === 'localhost' || endpoint.hostname === '127.0.0.1');
    if (!isHttps && !isLocalHttp) return '';
    const pathname = endpoint.pathname === '/' ? '' : endpoint.pathname;
    return endpoint.origin + pathname;
  } catch {
    // Not a valid URL — could be a contract address without explicit endpointType
    return value.startsWith('0x') ? value : '';
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
      origin.protocol === 'http:' && (origin.hostname === 'localhost' || origin.hostname === '127.0.0.1');
    if (!isHttps && !isLocalHttp) {
      return undefined;
    }
    return origin.origin;
  } catch {
    return undefined;
  }
}

function splitCSV(value: string): string[] {
  return value
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);
}

function parseDisclosures(params: URLSearchParams): string[] | undefined {
  const raw = params.get('disclosures');
  if (!raw) return undefined;
  const items = splitCSV(raw);
  return items.length > 0 ? items : undefined;
}

function parseExcludedCountries(params: URLSearchParams): string[] {
  const raw = params.get('excludedCountries');
  if (!raw) return [];
  return splitCSV(raw);
}

function parseDisplayLabels(params: URLSearchParams): string[] | null {
  const raw = params.get('proofItems');
  if (!raw) return null;
  const items = splitCSV(raw);
  return items.length > 0 ? items : null;
}
