'use client';

import '@selfxyz/widget'; // Side-effect: registers <self-verify> custom element
import { useEffect, useRef, useState } from 'react';
import type { PresetConfig } from '@/lib/presets';
import { CodeSnippet } from '@/components/CodeSnippet';
import { getSnippets } from '@/lib/snippets';

interface VerificationCardProps {
  preset: PresetConfig;
  onEvent?: (event: CardEvent) => void;
}

export interface CardEvent {
  cardId: string;
  type: 'status' | 'success' | 'error';
  timestamp: number;
  detail: unknown;
}

type CardState = 'idle' | 'verifying' | 'verified' | 'error';

export function VerificationCard({ preset, onEvent }: VerificationCardProps) {
  const storageKey = `sv-verified-${preset.id}`;
  const [state, setState] = useState<CardState>('idle');
  const [verifiedData, setVerifiedData] = useState<Record<string, unknown> | null>(null);
  const [showCode, setShowCode] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(storageKey);
    if (stored) {
      try {
        setState('verified');
        setVerifiedData(JSON.parse(stored));
      } catch {
        localStorage.removeItem(storageKey);
      }
    }
  }, [storageKey]);

  function handleSuccess(detail: { sessionId: string; token?: string; claims?: Record<string, unknown> }) {
    const data = detail.claims ?? {};
    localStorage.setItem(storageKey, JSON.stringify(data));
    setState('verified');
    setVerifiedData(data);
    onEvent?.({ cardId: preset.id, type: 'success', timestamp: Date.now(), detail });
  }

  function handleError(detail: unknown) {
    setState('error');
    onEvent?.({ cardId: preset.id, type: 'error', timestamp: Date.now(), detail });
  }

  function handleStatus(detail: unknown) {
    onEvent?.({ cardId: preset.id, type: 'status', timestamp: Date.now(), detail });
  }

  function startVerification() {
    setState('verifying');
  }

  function retry() {
    setState('idle');
  }

  return (
    <div className="flex flex-col rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-6 shadow-sm">
      <h3 className="text-lg font-semibold mb-2">{preset.name}</h3>
      <p className="text-sm text-gray-600 dark:text-gray-400 mb-6 flex-1">{preset.description}</p>

      {state === 'idle' && (
        <button
          onClick={startVerification}
          className="w-full py-2.5 px-4 bg-self-green text-white font-medium rounded-lg hover:opacity-90 transition-opacity"
        >
          Verify with Self
        </button>
      )}

      {state === 'verifying' && (
        <WidgetModal
          preset={preset}
          onSuccess={handleSuccess}
          onError={handleError}
          onStatus={handleStatus}
          onClose={() => setState('idle')}
        />
      )}

      {state === 'verified' && (
        <PrivacyPanel preset={preset} />
      )}

      {state === 'error' && (
        <div className="text-center">
          <p className="text-sm text-red-600 dark:text-red-400 mb-3">Verification failed</p>
          <button
            onClick={retry}
            className="py-2 px-4 text-sm border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            Try Again
          </button>
        </div>
      )}

      <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-800">
        <button
          onClick={() => setShowCode(!showCode)}
          className="text-xs text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
        >
          {showCode ? 'Hide Code' : 'View Code'}
        </button>
        {showCode && <CodeSnippet snippets={getSnippets(preset.preset)} />}
      </div>
    </div>
  );
}

function PrivacyPanel({ preset }: { preset: PresetConfig }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 mb-3">
        <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-self-green text-white text-xs">✓</span>
        <span className="text-sm font-medium text-self-green">Verified</span>
      </div>
      {preset.proven.map((field) => (
        <div key={field} className="flex items-center gap-2 text-sm">
          <span className="text-self-green">✓</span>
          <span>{field}</span>
        </div>
      ))}
      {preset.private.map((field) => (
        <div key={field} className="flex items-center gap-2 text-sm text-gray-400 dark:text-gray-500">
          <span>🔒</span>
          <span>{field}</span>
        </div>
      ))}
    </div>
  );
}

function WidgetModal({
  preset,
  onSuccess,
  onError,
  onStatus,
  onClose,
}: {
  preset: PresetConfig;
  onSuccess: (detail: { sessionId: string; token?: string; claims?: Record<string, unknown> }) => void;
  onError: (detail: unknown) => void;
  onStatus: (detail: unknown) => void;
  onClose: () => void;
}) {
  const [timedOut, setTimedOut] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const onSuccessRef = useRef(onSuccess);
  const onErrorRef = useRef(onError);
  const onStatusRef = useRef(onStatus);
  onSuccessRef.current = onSuccess;
  onErrorRef.current = onError;
  onStatusRef.current = onStatus;

  useEffect(() => {
    const timer = setTimeout(() => setTimedOut(true), 10 * 60 * 1000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!containerRef.current || timedOut) return;

    const el = document.createElement('self-verify');
    el.setAttribute('app-name', 'Self Verify Demo');
    el.setAttribute('app-scope', process.env.NEXT_PUBLIC_SELF_APP_SCOPE ?? 'self-verify-demo');
    el.setAttribute('app-endpoint', process.env.NEXT_PUBLIC_VERIFY_SERVICE_URL ?? 'https://verify.self.xyz');
    el.setAttribute('preset', preset.preset);

    el.addEventListener('self:success', ((e: CustomEvent) => onSuccessRef.current(e.detail)) as EventListener);
    el.addEventListener('self:error', ((e: CustomEvent) => onErrorRef.current(e.detail)) as EventListener);
    el.addEventListener('self:status', ((e: CustomEvent) => onStatusRef.current(e.detail)) as EventListener);

    containerRef.current.appendChild(el);

    return () => {
      if (containerRef.current?.contains(el)) {
        containerRef.current.removeChild(el);
      }
    };
  }, [preset.preset, timedOut]);

  if (timedOut) {
    return (
      <div className="text-center py-4">
        <p className="text-sm text-amber-600 dark:text-amber-400 mb-3">Verification timed out</p>
        <button
          onClick={onClose}
          className="py-2 px-4 text-sm border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div>
      <div ref={containerRef} />
      <button
        onClick={onClose}
        className="mt-3 w-full text-xs text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
      >
        Cancel
      </button>
    </div>
  );
}
