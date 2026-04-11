import { NextResponse } from 'next/server';
import { createSession } from '@/lib/sessions';

export async function POST(request: Request) {
  const { preset } = await request.json();
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
