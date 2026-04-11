import { NextResponse } from 'next/server';
import { getSession } from '@/lib/sessions';

export async function GET(_request: Request, { params }: { params: Promise<{ sessionId: string }> }) {
  const { sessionId } = await params;
  const session = getSession(sessionId);

  if (!session) {
    return NextResponse.json({ error: 'session not found' }, { status: 404 });
  }

  return NextResponse.json({
    status: session.status,
    claims: session.status === 'verified' ? session.claims : undefined,
  });
}
