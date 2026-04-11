'use client';

import { signIn, signOut, useSession } from 'next-auth/react';
import { useEffect, useRef, useState } from 'react';

let widgetLoaded = false;

export function LoginDemo() {
  const { data: session, status } = useSession();

  if (status === 'loading') {
    return (
      <div className="text-center py-12">
        <div className="inline-block w-6 h-6 border-2 border-gray-300 border-t-self-green rounded-full animate-spin" />
      </div>
    );
  }

  if (session) {
    return <LoggedInView session={session as unknown as { claims?: Record<string, unknown> }} />;
  }

  return <LoginView />;
}

function LoginView() {
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const serverSessionIdRef = useRef<string | null>(null);
  const onSuccessRef = useRef<(detail: Record<string, unknown>) => void>(() => {});
  const onErrorRef = useRef<(detail: unknown) => void>(() => {});
  const onStatusRef = useRef<(detail: unknown) => void>(() => {});

  onSuccessRef.current = async (detail: Record<string, unknown>) => {
    const sessionId = serverSessionIdRef.current;
    if (!sessionId) {
      setError('No server session. Please try again.');
      setVerifying(false);
      return;
    }

    try {
      // Step 1: POST claims to server to mark the session as verified
      const callbackRes = await fetch('/api/verify/callback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, claims: detail.claims || detail }),
      });

      if (!callbackRes.ok) {
        setError('Server verification failed. Please try again.');
        setVerifying(false);
        return;
      }

      // Step 2: Now sign in — authorize() will check the server-side verified session
      const result = await signIn('self-verify', {
        sessionId,
        redirect: false,
      });

      if (result?.error) {
        setError('Session creation failed. Please try again.');
        setVerifying(false);
      }
      // On success, useSession will update automatically
    } catch {
      setError('Something went wrong. Please try again.');
      setVerifying(false);
    }
  };

  onErrorRef.current = () => {
    setError('Verification failed. Please try again.');
    setVerifying(false);
  };

  onStatusRef.current = () => {};

  useEffect(() => {
    if (!verifying || !containerRef.current) return;
    let cancelled = false;
    let mountedEl: HTMLElement | null = null;

    async function mount() {
      // Step 0: Create a server-side session first
      try {
        const res = await fetch('/api/verify/session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ preset: 'kyc-basic' }),
        });
        const { sessionId } = await res.json();
        serverSessionIdRef.current = sessionId;
      } catch {
        if (!cancelled) {
          setError('Failed to create verification session.');
          setVerifying(false);
        }
        return;
      }

      if (!widgetLoaded) {
        await import('@selfxyz/widget');
        widgetLoaded = true;
      }
      if (cancelled || !containerRef.current) return;

      const el = document.createElement('self-verify');
      el.setAttribute('app-name', 'Self Verify Demo');
      el.setAttribute('app-scope', process.env.NEXT_PUBLIC_SELF_APP_SCOPE ?? 'self-verify-demo');
      el.setAttribute('app-endpoint', `${process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'}/api/verify/proof`);
      el.setAttribute('preset', 'kyc-basic');

      el.addEventListener('self:success', ((e: CustomEvent) => onSuccessRef.current(e.detail)) as EventListener);
      el.addEventListener('self:error', ((e: CustomEvent) => onErrorRef.current(e.detail)) as EventListener);
      el.addEventListener('self:status', ((e: CustomEvent) => onStatusRef.current(e.detail)) as EventListener);

      containerRef.current.appendChild(el);
      mountedEl = el;
    }

    mount();

    return () => {
      cancelled = true;
      if (mountedEl && containerRef.current?.contains(mountedEl)) {
        containerRef.current.removeChild(mountedEl);
      }
    };
  }, [verifying]);

  return (
    <div className="max-w-md mx-auto">
      <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-8 shadow-lg">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-800 mb-4">
            <svg width="32" height="32" viewBox="0 0 92 92" fill="none" className="text-gray-900 dark:text-white">
              <path d="M29.4862 38.0341C29.4862 32.8577 33.6281 28.6604 38.7362 28.6604H56.599L76.3837 8.61108H27.0606L9.3623 26.5461V56.0524H29.4862V38.0237V38.0341Z" fill="currentColor"/>
              <path d="M63.2384 36.0864V53.4903C63.2384 58.6666 59.0965 62.864 53.9884 62.864H36.8142L16.3409 83.6111H65.664L83.3623 65.6761V36.0968H63.2384V36.0864Z" fill="currentColor"/>
              <path d="M46.3726 37.3923H46.3623C41.6113 37.3923 37.7598 41.2959 37.7598 46.1111V46.1215C37.7598 50.9367 41.6113 54.8403 46.3623 54.8403H46.3726C51.1236 54.8403 54.9751 50.9367 54.9751 46.1215V46.1111C54.9751 41.2959 51.1236 37.3923 46.3726 37.3923Z" fill="currentColor"/>
            </svg>
          </div>
          <h3 className="text-xl font-bold mb-1">Welcome</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Sign in with your Self identity — no passwords, no email, just you.
          </p>
        </div>

        {!verifying ? (
          <div>
            <button
              onClick={() => { setError(null); setVerifying(true); }}
              className="w-full py-3 px-4 bg-self-green text-white font-semibold rounded-xl hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
            >
              <svg width="20" height="20" viewBox="0 0 92 92" fill="none">
                <path d="M29.4862 38.0341C29.4862 32.8577 33.6281 28.6604 38.7362 28.6604H56.599L76.3837 8.61108H27.0606L9.3623 26.5461V56.0524H29.4862V38.0237V38.0341Z" fill="currentColor"/>
                <path d="M63.2384 36.0864V53.4903C63.2384 58.6666 59.0965 62.864 53.9884 62.864H36.8142L16.3409 83.6111H65.664L83.3623 65.6761V36.0968H63.2384V36.0864Z" fill="currentColor"/>
                <path d="M46.3726 37.3923H46.3623C41.6113 37.3923 37.7598 41.2959 37.7598 46.1111V46.1215C37.7598 50.9367 41.6113 54.8403 46.3623 54.8403H46.3726C51.1236 54.8403 54.9751 50.9367 54.9751 46.1215V46.1111C54.9751 41.2959 51.1236 37.3923 46.3726 37.3923Z" fill="currentColor"/>
              </svg>
              Login with Self
            </button>
            {error && (
              <p className="mt-3 text-sm text-red-500 dark:text-red-400 text-center">{error}</p>
            )}
            <p className="mt-4 text-xs text-gray-400 dark:text-gray-500 text-center">
              Your passport data never leaves your device. Only the proof is shared.
            </p>
          </div>
        ) : (
          <div>
            <div ref={containerRef} className="min-h-[200px]" />
            <button
              onClick={() => setVerifying(false)}
              className="mt-3 w-full text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            >
              Cancel
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function LoggedInView({ session }: { session: { claims?: Record<string, unknown>; [key: string]: unknown } }) {
  const claims = (session.claims ?? {}) as Record<string, unknown>;

  return (
    <div className="max-w-md mx-auto">
      <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-8 shadow-lg">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-self-green/10 mb-4">
            <svg className="w-8 h-8 text-self-green" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h3 className="text-xl font-bold mb-1">You're logged in</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Verified with Self — session active
          </p>
        </div>

        <div className="space-y-3 mb-6">
          <div className="rounded-lg bg-gray-50 dark:bg-gray-800 p-4 space-y-2">
            <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Verified Claims</h4>
            {Object.entries(claims).map(([key, value]) => {
              if (key === 'sub' || key === 'iat' || key === 'exp' || key === 'aud' || value === undefined) return null;
              return (
                <div key={key} className="flex items-center justify-between text-sm">
                  <span className="text-gray-500 dark:text-gray-400">{formatClaimKey(key)}</span>
                  <span className="font-medium">{formatClaimValue(value)}</span>
                </div>
              );
            })}
            {Object.keys(claims).filter(k => !['sub', 'iat', 'exp', 'aud'].includes(k) && claims[k] !== undefined).length === 0 && (
              <p className="text-sm text-gray-400">Identity verified (no personal data disclosed)</p>
            )}
          </div>

          <div className="rounded-lg bg-gray-50 dark:bg-gray-800 p-4 space-y-2">
            <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Session</h4>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500 dark:text-gray-400">Status</span>
              <span className="inline-flex items-center gap-1.5 text-self-green font-medium">
                <span className="w-2 h-2 rounded-full bg-self-green" />
                Active
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500 dark:text-gray-400">Type</span>
              <span className="font-medium">NextAuth Session Cookie</span>
            </div>
          </div>

          <p className="text-xs text-gray-400 dark:text-gray-500 text-center">
            Refresh the page — your session persists via a secure HTTP-only cookie.
          </p>
        </div>

        <button
          onClick={() => signOut()}
          className="w-full py-2.5 px-4 border border-gray-300 dark:border-gray-600 rounded-xl text-sm font-medium hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        >
          Logout
        </button>
      </div>
    </div>
  );
}

function formatClaimKey(key: string): string {
  return key
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatClaimValue(value: unknown): string {
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (typeof value === 'string') return value;
  if (typeof value === 'number') return String(value);
  return JSON.stringify(value);
}
