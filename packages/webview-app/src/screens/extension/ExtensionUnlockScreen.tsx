// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import type React from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { ExtensionUnlockScreen as EuclidExtensionUnlockScreen } from '@selfxyz/euclid';

import { useSelfClient } from '../../providers/SelfClientProvider';
import { WEB_SAFE_AREA } from '../../utils/insets';

export const ExtensionUnlockScreen: React.FC = () => {
  const navigate = useNavigate();
  const { custody, haptic, analytics } = useSelfClient();
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [passkeyEnabled, setPasskeyEnabled] = useState(false);
  const [mode, setMode] = useState<'password' | 'passkey'>('password');
  const [confirmingReset, setConfirmingReset] = useState(false);
  const autoPrompted = useRef(false);

  const next = new URLSearchParams(window.location.search).get('next') ?? '/';

  const finish = useCallback(() => {
    navigate(next.startsWith('/') ? next : '/', { replace: true });
  }, [navigate, next]);

  const tryPasskey = useCallback(async () => {
    setBusy(true);
    setError('');
    try {
      const result = await custody.unlockWithPasskey();
      if (result.ok) {
        analytics.trackEvent('ext_unlock_passkey_ok');
        finish();
        return;
      }
      setError('Touch ID unlock failed. Use your password.');
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
    setBusy(false);
  }, [custody, analytics, finish]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const state = await custody.state();
      if (cancelled) return;
      if (!state.initialized) {
        navigate('/ext/link', { replace: true });
        return;
      }
      if (state.unlocked) {
        finish();
        return;
      }
      setMode(state.mode === 'passkey' ? 'passkey' : 'password');
      setPasskeyEnabled(state.passkeyEnabled);
      if (state.passkeyEnabled && !autoPrompted.current) {
        autoPrompted.current = true;
        void tryPasskey();
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [custody, navigate, finish, tryPasskey]);

  const tryPassword = useCallback(async () => {
    if (!password) return;
    setBusy(true);
    setError('');
    const result = await custody.unlock(password);
    if (result.ok) {
      analytics.trackEvent('ext_unlock_password_ok');
      finish();
      return;
    }
    setBusy(false);
    setError(
      result.cooldownMs && result.cooldownMs > 0
        ? `Too many attempts. Try again in ${Math.ceil(result.cooldownMs / 1000)}s.`
        : 'Wrong password.',
    );
  }, [custody, password, analytics, finish]);

  const handleReset = useCallback(() => {
    haptic.trigger('selection');
    if (!confirmingReset) {
      setConfirmingReset(true);
      return;
    }
    analytics.trackEvent('ext_unlock_reset_confirmed');
    void custody.reset();
  }, [haptic, analytics, custody, confirmingReset]);

  return (
    <EuclidExtensionUnlockScreen
      insets={WEB_SAFE_AREA.insets}
      mode={mode}
      passkeyEnabled={passkeyEnabled}
      password={password}
      onChangePassword={setPassword}
      error={error || undefined}
      busy={busy}
      onUnlock={() => void tryPassword()}
      onUnlockPasskey={() => void tryPasskey()}
      resetConfirming={confirmingReset}
      onReset={handleReset}
      logo={<img src="/icons/icon-128.png" alt="" width={56} height={56} />}
    />
  );
};
