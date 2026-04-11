import { NextResponse } from 'next/server';
import { verifySession } from '@/lib/sessions';

/**
 * Proof callback endpoint — the Self app POSTs the ZK proof here after the
 * user scans the QR code and completes verification.
 *
 * In a production app, you would verify the proof using SelfVerifier from
 * @selfxyz/core. For this demo, we accept the proof and mark the session
 * as verified. The scope matching between widget and this endpoint is what
 * prevents cross-app proof replay.
 *
 * Expected body from Self app (via websocket relayer or direct POST):
 * {
 *   proof, publicSignals, attestationId,
 *   userContextData, sessionId, ...
 * }
 */
export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'invalid JSON' }, { status: 400 });
  }

  const sessionId = body.sessionId as string | undefined;

  // Extract whatever claims/proof data the Self app sends
  const claims: Record<string, unknown> = {};
  if (body.proof) claims.proof = body.proof;
  if (body.publicSignals) claims.publicSignals = body.publicSignals;
  if (body.attestationId) claims.attestationId = body.attestationId;

  // TODO: In production, verify the proof here:
  //
  // import { SelfVerifier } from '@selfxyz/core';
  // const verifier = new SelfVerifier({
  //   scope: 'self-verify-demo',
  //   endpoint: process.env.NEXT_PUBLIC_APP_URL + '/api/verify/proof',
  //   preset: 'kyc-basic',
  //   testnet: true,
  // });
  // const result = await verifier.verify(
  //   body.attestationId, body.proof, body.publicSignals, body.userContextData
  // );

  // For the demo: mark the session as verified if we have a sessionId
  if (sessionId) {
    verifySession(sessionId, claims);
  }

  return NextResponse.json({ status: 'verified' });
}
