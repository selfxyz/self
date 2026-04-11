import { NextResponse } from 'next/server';
import { verifySession } from '@/lib/sessions';

/**
 * Proof callback endpoint — the Self app POSTs the ZK proof here after the
 * user scans the QR code and completes verification in the Self app.
 *
 * This is NOT called by the browser. The Self app reaches this endpoint
 * directly (via the ngrok/public URL embedded in the QR code). Only this
 * server-to-server path can mark a session as verified.
 *
 * In production, verify the proof using SelfVerifier from @selfxyz/core
 * before marking the session.
 */
export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'invalid JSON' }, { status: 400 });
  }

  const sessionId = body.sessionId as string | undefined;
  if (!sessionId) {
    return NextResponse.json({ error: 'sessionId is required' }, { status: 400 });
  }

  // Extract claims from the proof payload
  const claims: Record<string, unknown> = {};
  if (body.proof) claims.proof = body.proof;
  if (body.publicSignals) claims.publicSignals = body.publicSignals;
  if (body.attestationId) claims.attestationId = body.attestationId;
  if (body.userContextData) claims.userContextData = body.userContextData;

  // TODO: In production, verify the ZK proof here:
  //
  // import { SelfVerifier } from '@selfxyz/core';
  // const verifier = new SelfVerifier({
  //   scope: process.env.NEXT_PUBLIC_SELF_APP_SCOPE,
  //   endpoint: `${process.env.NEXT_PUBLIC_APP_URL}/api/verify/proof`,
  //   preset: 'kyc-basic',
  //   testnet: true,
  // });
  // const result = await verifier.verify(
  //   body.attestationId, body.proof, body.publicSignals, body.userContextData
  // );

  const ok = verifySession(sessionId, claims);
  if (!ok) {
    return NextResponse.json({ error: 'invalid or expired session' }, { status: 404 });
  }

  return NextResponse.json({ status: 'verified' });
}
