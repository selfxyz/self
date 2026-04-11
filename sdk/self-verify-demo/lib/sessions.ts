interface Session {
  id: string;
  preset: string;
  status: 'pending' | 'verified' | 'failed';
  claims?: Record<string, unknown>;
  createdAt: number;
}

const TTL_MS = 10 * 60 * 1000;
const sessions = new Map<string, Session>();

function cleanup() {
  const now = Date.now();
  for (const [id, session] of sessions) {
    if (now - session.createdAt > TTL_MS) {
      sessions.delete(id);
    }
  }
}

export function createSession(preset: string): Session {
  cleanup();
  const session: Session = {
    id: crypto.randomUUID(),
    preset,
    status: 'pending',
    createdAt: Date.now(),
  };
  sessions.set(session.id, session);
  return session;
}

export function getSession(id: string): Session | undefined {
  cleanup();
  return sessions.get(id);
}

export function verifySession(id: string, claims: Record<string, unknown>): boolean {
  const session = sessions.get(id);
  if (!session || session.status !== 'pending') return false;
  session.status = 'verified';
  session.claims = claims;
  return true;
}
