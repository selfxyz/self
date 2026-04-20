import { NextResponse } from 'next/server';
import {
  SelfVerifier,
  ConfigMismatchError,
  type PresetName,
} from '@selfxyz/core';
import { getSession, verifySession } from '@/lib/sessions';

export const runtime = 'nodejs';

/**
 * Proof callback endpoint — the Self app POSTs the ZK proof here after the
 * user scans the QR code and completes verification in the Self app.
 *
 * This is NOT called by the browser. The Self app reaches this endpoint
 * directly via the public URL (NEXT_PUBLIC_APP_URL) embedded in the QR.
 * Only this server-to-server path can mark a session as verified.
 *
 * The request body contains { attestationId, proof, publicSignals, userContextData }.
 * The sessionId is NOT passed in the body — it is recovered from userContextData,
 * where it was embedded when the widget set user-id=sessionId on mount.
 */

const PRESET_NAMES: readonly PresetName[] = [
  'human',
  'age-18',
  'age-21',
  'kyc-basic',
  'kyc-full',
];

function extractSessionIdFromUserContextData(
  userContextData: string,
): string | null {
  // userContextData layout (hex-encoded):
  //   configId (32 bytes)  — chars 0..64
  //   userIdentifier (32 bytes, zero-padded UUID) — chars 64..128
  //   userDefinedData (rest)
  if (userContextData.length < 128) return null;
  const userIdHex = userContextData.slice(64, 128);
  let big: bigint;
  try {
    big = BigInt('0x' + userIdHex);
  } catch {
    return null;
  }
  // A UUID is 16 bytes; the high 16 bytes of the 32-byte slot are zero.
  const uuidHex = big.toString(16).padStart(32, '0');
  return `${uuidHex.slice(0, 8)}-${uuidHex.slice(8, 12)}-${uuidHex.slice(12, 16)}-${uuidHex.slice(16, 20)}-${uuidHex.slice(20)}`;
}

function isPresetName(value: string): value is PresetName {
  return (PRESET_NAMES as readonly string[]).includes(value);
}

export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'invalid JSON' }, { status: 400 });
  }

  const attestationId = body.attestationId;
  const proof = body.proof;
  const publicSignals = body.publicSignals;
  const userContextData = body.userContextData;

  if (
    typeof attestationId !== 'number' ||
    !proof ||
    !Array.isArray(publicSignals) ||
    typeof userContextData !== 'string'
  ) {
    return NextResponse.json(
      {
        error:
          'attestationId, proof, publicSignals, and userContextData are required',
      },
      { status: 400 },
    );
  }

  // Recover the sessionId the widget embedded via user-id, then look up the
  // server-side session so we know which preset to verify against.
  const sessionId = extractSessionIdFromUserContextData(userContextData);
  if (!sessionId) {
    return NextResponse.json(
      { error: 'invalid userContextData' },
      { status: 400 },
    );
  }

  const session = getSession(sessionId);
  if (!session || session.status !== 'pending') {
    return NextResponse.json(
      { error: 'invalid or expired session' },
      { status: 404 },
    );
  }

  if (!isPresetName(session.preset)) {
    return NextResponse.json(
      { error: `unsupported preset: ${session.preset}` },
      { status: 400 },
    );
  }

  const scope = process.env.NEXT_PUBLIC_SELF_APP_SCOPE ?? 'self-verify-demo';
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (!appUrl) {
    console.error('NEXT_PUBLIC_APP_URL is not set — cannot verify proof');
    return NextResponse.json(
      { error: 'server misconfigured' },
      { status: 500 },
    );
  }
  const endpoint = `${appUrl}/api/verify/proof`;

  const verifier = new SelfVerifier({
    scope,
    endpoint,
    preset: session.preset,
    testnet: true,
  });

  let result;
  try {
    result = await verifier.verify(
      attestationId as Parameters<typeof verifier.verify>[0],
      proof as Parameters<typeof verifier.verify>[1],
      publicSignals as Parameters<typeof verifier.verify>[2],
      userContextData,
    );
  } catch (error) {
    if (error instanceof ConfigMismatchError) {
      return NextResponse.json(
        { error: 'proof validation failed', issues: error.issues },
        { status: 400 },
      );
    }
    console.error('SelfVerifier.verify threw:', error);
    return NextResponse.json({ error: 'verification error' }, { status: 500 });
  }

  if (!result.isValidDetails.isValid) {
    return NextResponse.json({ error: 'invalid proof' }, { status: 400 });
  }

  // Preset-specific gates. isOfacValid is `true` when the user IS on the OFAC
  // list (counterintuitive), so for kyc presets we reject when it is true.
  if (
    (session.preset === 'age-18' || session.preset === 'age-21') &&
    !result.isValidDetails.isMinimumAgeValid
  ) {
    return NextResponse.json(
      { error: 'age requirement not met' },
      { status: 400 },
    );
  }
  if (
    (session.preset === 'kyc-basic' || session.preset === 'kyc-full') &&
    result.isValidDetails.isOfacValid
  ) {
    return NextResponse.json({ error: 'OFAC match' }, { status: 400 });
  }

  // Bind: the userIdentifier returned by the verifier must match the sessionId
  // we parsed from userContextData. Belt-and-braces — the verifier already
  // hash-checks userContextData against the circuit — but makes binding explicit.
  if (result.userData.userIdentifier !== sessionId) {
    return NextResponse.json({ error: 'session mismatch' }, { status: 400 });
  }

  // Build sanitized claims from the disclose output. Only include fields the
  // preset promises to disclose; everything else remains zero-knowledge.
  const disclose = result.discloseOutput;
  const claims: Record<string, unknown> = {
    sub: sessionId,
    preset: session.preset,
    attestationId: result.attestationId,
    nullifier: disclose.nullifier,
  };
  if (session.preset === 'age-18' || session.preset === 'age-21') {
    claims.minimumAge = disclose.minimumAge;
  }
  if (session.preset === 'kyc-basic' || session.preset === 'kyc-full') {
    claims.name = disclose.name;
    claims.nationality = disclose.nationality;
    claims.dateOfBirth = disclose.dateOfBirth;
  }
  if (session.preset === 'kyc-full') {
    claims.idNumber = disclose.idNumber;
    claims.gender = disclose.gender;
    claims.expiryDate = disclose.expiryDate;
    claims.issuingState = disclose.issuingState;
  }

  const ok = verifySession(sessionId, claims);
  if (!ok) {
    return NextResponse.json(
      { error: 'session could not be verified' },
      { status: 409 },
    );
  }

  return NextResponse.json({ status: 'verified' });
}
