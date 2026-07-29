import { useCallback, useEffect, useMemo, useState } from 'react';
import { v4 as uuidv4 } from 'uuid';

import { isSelfExtensionAvailable, requestVerification } from '@selfxyz/chrome-extension/sdk';
import { SelfAppBuilder, SelfQRcodeWrapper } from '@selfxyz/qrcode';

// The endpoint must be reachable by the TEE (and SelfAppBuilder rejects
// localhost), so run `ngrok http 3111` and set VITE_VERIFY_ENDPOINT +
// VERIFY_ENDPOINT (backend) to https://<tunnel>/api/verify. Scope+endpoint
// must match the backend verifier exactly. The placeholder default keeps the
// page functional for wiring tests; proof delivery needs the tunnel.
const VERIFY_ENDPOINT = import.meta.env.VITE_VERIFY_ENDPOINT ?? 'https://self-ext-demo.example/api/verify';
const SCOPE = 'ext-spike-demo';

type Phase = 'idle' | 'extension-running' | 'succeeded' | 'failed';

interface BackendState {
  verified: boolean;
  minimumAge?: number;
  timestamp?: string;
}

export function App() {
  const [userId] = useState(() => uuidv4());
  const [extensionAvailable, setExtensionAvailable] = useState<boolean | null>(null);
  const [phase, setPhase] = useState<Phase>('idle');
  const [detail, setDetail] = useState('');
  const [backend, setBackend] = useState<BackendState | null>(null);

  const selfApp = useMemo(
    () =>
      new SelfAppBuilder({
        appName: 'Sip & Proof',
        scope: SCOPE,
        endpoint: VERIFY_ENDPOINT,
        endpointType: 'staging_https',
        userId,
        userIdType: 'uuid',
        version: 2,
        devMode: true,
        disclosures: { minimumAge: 18 },
      }).build(),
    [userId],
  );

  useEffect(() => {
    void isSelfExtensionAvailable().then(setExtensionAvailable);
  }, []);

  // Backend confirmation: poll the demo backend's record of the TEE-delivered
  // proof, so the page can show *server-side* verification, not just the
  // relayer status.
  useEffect(() => {
    if (phase !== 'succeeded') return;
    const timer = setInterval(async () => {
      try {
        const response = await fetch('/api/last-verification');
        if (!response.ok) return;
        const data = (await response.json()) as BackendState | null;
        if (data?.verified) {
          setBackend(data);
          clearInterval(timer);
        }
      } catch {
        // backend not up; keep polling
      }
    }, 1_000);
    return () => clearInterval(timer);
  }, [phase]);

  const verifyWithExtension = useCallback(async () => {
    setPhase('extension-running');
    setDetail('Waiting for approval in the Self extension…');
    try {
      const result = await requestVerification(selfApp as unknown as { sessionId: string } & Record<string, unknown>);
      if (result.success) {
        setPhase('succeeded');
        setDetail('Extension reported success.');
      } else {
        setPhase('failed');
        setDetail(`${result.error?.code ?? 'FAILED'}: ${result.error?.message ?? 'Verification failed'}`);
      }
    } catch (error) {
      setPhase('failed');
      setDetail(error instanceof Error ? error.message : String(error));
    }
  }, [selfApp]);

  return (
    <main style={styles.main}>
      <h1 style={styles.h1}>Sip &amp; Proof</h1>
      <p style={styles.sub}>A very serious beverage shop. Prove you are 18+ with Self to enter.</p>

      {phase === 'succeeded' ? (
        <section style={{ ...styles.card, borderColor: '#2e9e5b' }}>
          <h2 style={styles.h2}>Age verified 🎉</h2>
          <p>{detail}</p>
          <p style={styles.small}>
            {backend?.verified
              ? `Backend confirmation: proof verified server-side at ${backend.timestamp} (minimumAge ${backend.minimumAge}).`
              : 'Waiting for the backend to receive the proof from the TEE…'}
          </p>
        </section>
      ) : (
        <section style={styles.card}>
          <h2 style={styles.h2}>Verify your age</h2>
          {extensionAvailable && (
            <button style={styles.button} disabled={phase === 'extension-running'} onClick={() => void verifyWithExtension()}>
              {phase === 'extension-running' ? 'Waiting for the extension…' : 'Verify with the Self extension'}
            </button>
          )}
          {extensionAvailable === false && <p style={styles.small}>Self extension not detected - scan the QR with the Self app instead.</p>}
          <div style={{ marginTop: 16 }}>
            <SelfQRcodeWrapper
              selfApp={selfApp}
              type="websocket"
              onSuccess={() => {
                setPhase('succeeded');
                setDetail('Relayer reported proof_verified.');
              }}
              onError={data => {
                setPhase('failed');
                setDetail(`${(data as { error_code?: string })?.error_code ?? 'FAILED'}`);
              }}
            />
          </div>
          {phase === 'failed' && <p style={{ ...styles.small, color: '#c0392b' }}>{detail}</p>}
          {phase === 'extension-running' && <p style={styles.small}>{detail}</p>}
        </section>
      )}

      <p style={styles.small}>
        session {selfApp.sessionId} · scope {SCOPE} · endpoint {VERIFY_ENDPOINT}
      </p>
    </main>
  );
}

const styles: Record<string, React.CSSProperties> = {
  main: { maxWidth: 480, margin: '48px auto', fontFamily: 'system-ui, sans-serif', padding: '0 16px' },
  h1: { fontSize: 32, marginBottom: 4 },
  h2: { fontSize: 20, marginTop: 0 },
  sub: { color: '#555' },
  card: { border: '2px solid #ddd', borderRadius: 12, padding: 20, marginTop: 24 },
  button: {
    padding: '12px 20px',
    borderRadius: 24,
    border: 'none',
    background: '#111',
    color: '#fff',
    fontSize: 15,
    cursor: 'pointer',
  },
  small: { fontSize: 12, color: '#777' },
};
