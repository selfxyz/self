import { NextResponse } from 'next/server';
import { verifySession } from '@/lib/sessions';

export async function POST(request: Request) {
  const { sessionId, claims } = await request.json();
  if (!sessionId || !claims) {
    return NextResponse.json({ error: 'sessionId and claims are required' }, { status: 400 });
  }

  const ok = verifySession(sessionId, claims);
  if (!ok) {
    return NextResponse.json({ error: 'invalid or expired session' }, { status: 404 });
  }

  return NextResponse.json({ verified: true });
}
