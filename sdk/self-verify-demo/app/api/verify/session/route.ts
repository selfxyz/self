import { NextResponse } from 'next/server';
import { createSession } from '@/lib/sessions';

export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'invalid JSON body' }, { status: 400 });
  }
  const { preset } = body;
  if (!preset || typeof preset !== 'string') {
    return NextResponse.json({ error: 'preset is required' }, { status: 400 });
  }

  const session = createSession(preset);

  return NextResponse.json({
    sessionId: session.id,
    appScope: process.env.NEXT_PUBLIC_SELF_APP_SCOPE ?? 'self-verify-demo',
    verifyServiceUrl: process.env.NEXT_PUBLIC_VERIFY_SERVICE_URL ?? 'https://verify.self.xyz',
  });
}
