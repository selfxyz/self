// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import {
  parseSessionReference,
  resolveEnterpriseSession,
} from '../enterpriseSession';

const SESSION_ID = '3f2c8a1e-9b4d-4e6f-8a2b-1c3d5e7f9a0b';

// Fixture mirroring edge-api's PublicSessionResponse
// (self-dashboard apps/edge-api/src/routes/sessions.ts).
const baseSession = () => ({
  id: SESSION_ID,
  orgId: 'a1b2c3d4-e5f6-7890-abcd-ef0123456789',
  environment: 'live',
  status: 'pending',
  createdAt: '2026-08-01T00:00:00.000Z',
  completedAt: null,
  expiresAt: new Date(Date.now() + 3_600_000).toISOString(),
  flowVersionId: 'fv-1',
  flowName: 'Age Gate',
  externalUuid: 'c0ffee00-1234-4abc-9def-000000000001',
  metadata: null,
  predicatesConfig: null as Record<string, unknown> | null,
  iconUrl: null,
  proofAttributes: null,
  successUrl: null,
  failureUrl: null,
  product: 'pre_kyc',
  storage: { state: 'pending', uri: null, credentialId: null },
});

function mockFetchOnce(body: unknown, init?: { status?: number }) {
  const status = init?.status ?? 200;
  const fetchMock = vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('parseSessionReference', () => {
  it('prefers an explicit id over a url', () => {
    expect(
      parseSessionReference({
        id: SESSION_ID,
        url: 'https://verify.self.xyz/s/other',
      }),
    ).toBe(SESSION_ID);
  });

  it('extracts the session id from a verificationUrl path', () => {
    expect(
      parseSessionReference({ url: `https://verify.self.xyz/s/${SESSION_ID}` }),
    ).toBe(SESSION_ID);
  });

  it('accepts the future opaque token form in the url path', () => {
    expect(
      parseSessionReference({
        url: 'https://verify.self.xyz/s/verify_live_a1B2c3D4e5F6g7H8i9',
      }),
    ).toBe('verify_live_a1B2c3D4e5F6g7H8i9');
  });

  it('accepts a bare non-URL string as the reference', () => {
    expect(parseSessionReference({ url: SESSION_ID })).toBe(SESSION_ID);
  });

  it('rejects an empty session reference', () => {
    expect(() => parseSessionReference({})).toThrowError(
      expect.objectContaining({ code: 'SESSION_REF_INVALID' }),
    );
  });

  it('rejects a malformed reference', () => {
    expect(() => parseSessionReference({ id: 'nope !' })).toThrowError(
      expect.objectContaining({ code: 'SESSION_REF_INVALID' }),
    );
  });
});

describe('resolveEnterpriseSession derivation', () => {
  it('derives the full request from a live session', async () => {
    mockFetchOnce(baseSession());
    const request = await resolveEnterpriseSession({ id: SESSION_ID });

    expect(request).toMatchObject({
      userId: 'c0ffee00-1234-4abc-9def-000000000001',
      userIdType: 'uuid',
      // orgId with dashes stripped, capped at 30 chars
      scope: 'a1b2c3d4e5f67890abcdef01234567',
      appEndpoint: 'https://verifier.self.xyz/verify',
      endpointType: 'https',
      environment: 'prod',
      appName: 'Age Gate',
      version: 2,
      verificationId: SESSION_ID,
    });
    expect(request.scope).toHaveLength(30);
    // Load-bearing: the verifier correlates proof↔session by parsing exactly
    // this JSON out of userContextData.
    expect(request.userDefinedData).toBe(
      JSON.stringify({ verificationId: SESSION_ID }),
    );
    expect(request.enterpriseSession).toBeUndefined();
  });

  it('maps a test-environment session to staging endpoints', async () => {
    mockFetchOnce({ ...baseSession(), environment: 'test' });
    const request = await resolveEnterpriseSession({ id: SESSION_ID });
    expect(request.appEndpoint).toBe(
      'https://verifier.staging.self.xyz/verify',
    );
    expect(request.endpointType).toBe('staging_https');
    expect(request.environment).toBe('stg');
  });

  it('falls back to the default appName when flowName is empty', async () => {
    mockFetchOnce({ ...baseSession(), flowName: null });
    const request = await resolveEnterpriseSession({ id: SESSION_ID });
    expect(request.appName).toBe('Self Verification');
  });

  it('maps predicatesConfig to the disclosure grammar the WebView parses', async () => {
    mockFetchOnce({
      ...baseSession(),
      predicatesConfig: {
        minimumAge: 18,
        ofac: true,
        excludedCountries: ['PRK', 'IRN'],
        includedCountries: ['USA'],
        disclosures: {
          fullName: true,
          documentNumber: true,
          dateOfBirth: true,
          gender: false,
          expirationDate: true,
          issuingState: true,
        },
      },
    });
    const request = await resolveEnterpriseSession({ id: SESSION_ID });
    expect(request.disclosures).toEqual(
      expect.arrayContaining([
        'minimumAge:18',
        'ofac',
        // includedCountries non-empty → nationality requested (allowlist is
        // enforced verifier-side against the disclosed nationality)
        'nationality',
        'name',
        'passport_number',
        'date_of_birth',
        'expiry_date',
        'issuing_state',
      ]),
    );
    expect(request.disclosures).not.toContain('gender');
    expect(request.excludedCountries).toEqual(['PRK', 'IRN']);
  });

  it('produces empty disclosures for a null predicatesConfig', async () => {
    mockFetchOnce(baseSession());
    const request = await resolveEnterpriseSession({ id: SESSION_ID });
    expect(request.disclosures).toEqual([]);
    expect(request.excludedCountries).toEqual([]);
  });

  it('uses the apiUrl override and encodes the reference', async () => {
    const fetchMock = mockFetchOnce(baseSession());
    await resolveEnterpriseSession({
      id: SESSION_ID,
      apiUrl: 'http://localhost:8787/',
    });
    expect(fetchMock).toHaveBeenCalledWith(
      `http://localhost:8787/v1/sessions/${SESSION_ID}`,
      expect.objectContaining({ signal: expect.anything() }),
    );
  });
});

describe('resolveEnterpriseSession failures', () => {
  it('rejects an expired-status session', async () => {
    mockFetchOnce({ ...baseSession(), status: 'expired' });
    await expect(
      resolveEnterpriseSession({ id: SESSION_ID }),
    ).rejects.toMatchObject({
      code: 'SESSION_EXPIRED',
    });
  });

  it('rejects an already-terminal session', async () => {
    mockFetchOnce({ ...baseSession(), status: 'valid' });
    await expect(
      resolveEnterpriseSession({ id: SESSION_ID }),
    ).rejects.toMatchObject({
      code: 'SESSION_ALREADY_PROCESSED',
    });
  });

  it('rejects a pending session whose expiresAt has passed (no server sweeper)', async () => {
    mockFetchOnce({
      ...baseSession(),
      expiresAt: new Date(Date.now() - 1000).toISOString(),
    });
    await expect(
      resolveEnterpriseSession({ id: SESSION_ID }),
    ).rejects.toMatchObject({
      code: 'SESSION_EXPIRED',
    });
  });

  it('maps 404 to SESSION_NOT_FOUND', async () => {
    mockFetchOnce({ error: { code: 'not_found' } }, { status: 404 });
    await expect(
      resolveEnterpriseSession({ id: SESSION_ID }),
    ).rejects.toMatchObject({
      code: 'SESSION_NOT_FOUND',
    });
  });

  it('maps other HTTP failures to SESSION_RESOLVE_FAILED', async () => {
    mockFetchOnce({ error: { code: 'internal_error' } }, { status: 500 });
    await expect(
      resolveEnterpriseSession({ id: SESSION_ID }),
    ).rejects.toMatchObject({
      code: 'SESSION_RESOLVE_FAILED',
    });
  });

  it('rejects a response missing required fields', async () => {
    mockFetchOnce({ id: SESSION_ID });
    await expect(
      resolveEnterpriseSession({ id: SESSION_ID }),
    ).rejects.toMatchObject({
      code: 'SESSION_RESOLVE_FAILED',
    });
  });

  it('maps a network error to SESSION_RESOLVE_FAILED', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockRejectedValue(new TypeError('Network request failed')),
    );
    await expect(
      resolveEnterpriseSession({ id: SESSION_ID }),
    ).rejects.toMatchObject({
      code: 'SESSION_RESOLVE_FAILED',
    });
  });
});
