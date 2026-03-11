// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import React, { createContext, useContext, useMemo } from 'react';
import type { VerificationRequest } from '@selfxyz/mobile-sdk-alpha';

export interface VerificationRequestContext {
  /** Parsed verification request from URL params. */
  request: VerificationRequest;
  /** Optional display-label overrides from the host (proofItems param). */
  displayLabels: string[] | null;
  /** Display name for the requesting application. */
  appName: string;
  /** Sanitized host/endpoint string for the requesting application. */
  appEndpoint: string;
  /** Timestamp of the request (epoch ms). */
  timestamp: number;
  /** The request type (e.g. 'proofRequested'). */
  requestType: string;
}

const ALLOWED_REQUEST_TYPES = new Set([
  'proofRequested',
  'documentOwnershipConfirmed',
]);
const DEFAULT_REQUEST_TYPE = 'proofRequested';

const Ctx = createContext<VerificationRequestContext | null>(null);

export function useVerificationRequest(): VerificationRequestContext {
  const ctx = useContext(Ctx);
  if (!ctx) {
    throw new Error(
      'useVerificationRequest must be used within a VerificationRequestProvider',
    );
  }
  return ctx;
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

function parseFromURL(): VerificationRequestContext {
  const params = new URLSearchParams(window.location.search);

  const request: VerificationRequest = {
    userId: params.get('userId') ?? undefined,
    scope: params.get('scope') ?? undefined,
    disclosures: parseDisclosures(params),
  };

  const queryTimestamp = params.get('timestamp');
  const parsed = queryTimestamp ? Number(queryTimestamp) : Number.NaN;

  return {
    request,
    displayLabels: parseDisplayLabels(params),
    appName: params.get('appName') ?? 'Verification',
    appEndpoint: normalizeAppEndpoint(params.get('appEndpoint')),
    timestamp: Number.isFinite(parsed) ? parsed : Date.now(),
    requestType: normalizeRequestType(params.get('resultType')),
  };
}

export const VerificationRequestProvider: React.FC<{
  children: React.ReactNode;
}> = ({ children }) => {
  const value = useMemo(() => parseFromURL(), []);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
};
