import { NextResponse } from 'next/server';
import { verifySession } from '@/lib/sessions';

export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'invalid JSON body' }, { status: 400 });
  }
  const { sessionId, claims } = body;
  if (!sessionId || typeof sessionId !== 'string' || !claims || typeof claims !== 'object') {
    return NextResponse.json({ error: 'sessionId and claims are required' }, { status: 400 });
  }

  const ok = verifySession(sessionId, claims as Record<string, unknown>);
  if (!ok) {
    return NextResponse.json({ error: 'invalid or expired session' }, { status: 404 });
  }

  return NextResponse.json({ verified: true });
}
