// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import type React from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import type { ExtensionLinkStep, QRDisplayState } from '@selfxyz/euclid';
import { ExtensionLinkScreen as EuclidExtensionLinkScreen } from '@selfxyz/euclid';
import type { CustodyLinkEvent } from '@selfxyz/webview-bridge/adapters';

import { useSelfClient } from '../../providers/SelfClientProvider';
import { WEB_SAFE_AREA } from '../../utils/insets';

const MIN_PASSWORD_LENGTH = 12;

export const ExtensionLinkScreen: React.FC = () => {
  const navigate = useNavigate();
  const { custody, haptic, analytics } = useSelfClient();
  const [step, setStep] = useState<ExtensionLinkStep>('qr');
  const [qrContent, setQrContent] = useState('');
  const [qrState, setQrState] = useState<QRDisplayState>('generating');
  const [qrCaption, setQrCaption] = useState('Scan this code with the Self app.');
  const [sas, setSas] = useState<string[]>([]);
  const [error, setError] = useState('');
  const [docCount, setDocCount] = useState(0);
  const [busy, setBusy] = useState(false);
  const [pw1, setPw1] = useState('');
  const [pw2, setPw2] = useState('');
  const [strength, setStrength] = useState('');
  const [session, setSession] = useState(0);
  const stepRef = useRef<ExtensionLinkStep>('qr');
  stepRef.current = step;

  useEffect(() => {
    let cancelled = false;
    setQrState('generating');
    setError('');
    setSas([]);
    void custody.createLinkSession().then(({ qrContent: content }) => {
      if (cancelled) return;
      setQrContent(content);
      setQrState('ready');
    });
    const unsubscribe = custody.onLinkEvent((event: CustodyLinkEvent) => {
      if (cancelled) return;
      switch (event.stage) {
        case 'waiting':
          setQrCaption('Scan this code with the Self app.');
          break;
        case 'hello':
          setSas(event.sas ?? []);
          setStep('verify');
          break;
        case 'imported':
          setDocCount(event.docCount ?? 0);
          setStep('custody');
          break;
        case 'expired':
          setStep('qr');
          setQrState('expired');
          setQrCaption('This code expired for your safety.');
          break;
        case 'error':
          if (stepRef.current === 'custody') {
            // Keep the user on custody: the account is already here, only
            // securing it failed.
            setError(event.message ?? 'Something went wrong.');
          } else {
            setError(event.message ?? 'Something went wrong. Get a new code.');
            setStep('error');
          }
          break;
        case 'done':
          break;
      }
    });
    return () => {
      cancelled = true;
      unsubscribe();
      if (stepRef.current === 'qr' || stepRef.current === 'verify') void custody.cancelLinkSession();
    };
    // `session` bumps tear down and recreate the link session (regenerate).
  }, [custody, session]);

  useEffect(() => {
    if (!pw1) {
      setStrength('');
      return;
    }
    let cancelled = false;
    void custody.passwordStrength(pw1).then(({ label }) => {
      if (!cancelled) setStrength(label);
    });
    return () => {
      cancelled = true;
    };
  }, [custody, pw1]);

  const regenerate = useCallback(() => {
    haptic.trigger('selection');
    setStep('qr');
    setError('');
    setSas([]);
    setSession(count => count + 1);
  }, [haptic]);

  const securePasskey = useCallback(async () => {
    setBusy(true);
    setError('');
    try {
      await custody.completeLink('passkey');
      analytics.trackEvent('ext_link_custody_passkey');
      setStep('done');
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
    setBusy(false);
  }, [custody, analytics]);

  const securePassword = useCallback(async () => {
    if (pw1.length < MIN_PASSWORD_LENGTH) {
      setError(`Password must be at least ${MIN_PASSWORD_LENGTH} characters.`);
      return;
    }
    if (pw1 !== pw2) {
      setError('Passwords do not match.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      await custody.completeLink('password', pw1);
      analytics.trackEvent('ext_link_custody_password');
      setStep('done');
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
    setBusy(false);
  }, [custody, analytics, pw1, pw2]);

  const inPopup = new URLSearchParams(window.location.search).get('ctx') === 'popup';
  const openInWindow = useCallback(() => {
    haptic.trigger('selection');
    const params = new URLSearchParams(window.location.search);
    params.delete('ctx');
    const search = params.toString();
    // Served at the extension root, so a relative URL stays on our origin.
    window.open(`/index.html${search ? `?${search}` : ''}`, '_blank', 'popup,width=430,height=800');
    window.close();
  }, [haptic]);

  return (
    <EuclidExtensionLinkScreen
      insets={WEB_SAFE_AREA.insets}
      step={step}
      qrContent={qrContent}
      qrState={qrState}
      qrCaption={qrCaption}
      sas={sas}
      docCount={docCount}
      error={error || undefined}
      busy={busy}
      strengthLabel={strength || undefined}
      password={pw1}
      repeatPassword={pw2}
      onChangePassword={setPw1}
      onChangeRepeatPassword={setPw2}
      onSecureWithPasskey={() => void securePasskey()}
      onSecureWithPassword={() => void securePassword()}
      onRegenerate={regenerate}
      onOpenInWindow={inPopup ? openInWindow : undefined}
      onDone={() => {
        analytics.trackEvent('ext_link_done_open');
        navigate('/', { replace: true });
      }}
    />
  );
};
