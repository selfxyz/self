// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import React, { useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ProofRequestScreen, SelfLogo } from '@selfxyz/euclid-web';

import { useSelfClient } from '../../providers/SelfClientProvider';

export const ProvingScreen: React.FC = () => {
  const navigate = useNavigate();
  const { analytics, haptic, lifecycle } = useSelfClient();
  const [proving, setProving] = useState(false);

  const onVerify = useCallback(async () => {
    haptic.trigger('selection');
    analytics.trackEvent('prove_verify_pressed');
    setProving(true);

    try {
      await lifecycle.setResult({
        type: 'proofRequested',
      });

      navigate('/proving/result', { state: { success: true } });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Proving failed';
      analytics.trackEvent('prove_verify_failed', { error: message });
      navigate('/proving/result', {
        state: { success: false, error: message },
      });
    } finally {
      setProving(false);
    }
  }, [navigate, analytics, haptic, lifecycle]);

  const onCancel = useCallback(() => {
    haptic.trigger('selection');
    navigate('/');
  }, [navigate, haptic]);

  return (
    <ProofRequestScreen
      insets={{ top: 0, bottom: 0 }}
      variant={proving ? 'loading' : 'default'}
      onClose={onCancel}
      onConfirm={onVerify}
      appIcon={<SelfLogo size={40} />}
      appName="Verification"
      appEndpoint=""
      timestamp={Date.now()}
      items={[
        { label: 'Age verification' },
        { label: 'Nationality' },
        { label: 'Document validity' },
      ]}
    />
  );
};
