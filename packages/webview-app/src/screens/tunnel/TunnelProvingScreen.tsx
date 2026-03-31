// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import type React from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import type { ProofGenerationStep } from '@selfxyz/euclid';
import { ProofGenerationScreen } from '@selfxyz/euclid';
import type { ProvingStateType } from '@selfxyz/mobile-sdk-alpha/browser';
import { useProvingStore } from '@selfxyz/mobile-sdk-alpha/browser';

import { useSelfClient } from '../../providers/SelfClientProvider';
import { useVerificationRequest } from '../../providers/VerificationRequestProvider';
import { WEB_SAFE_AREA } from '../../utils/insets';
import { initSelfAppFromRequest } from '../../utils/selfAppContext';

const MOCK_ID_CARD = {
  variant: 'passport' as const,
  title: 'Passport',
  subtitle: 'Mock Passport',
};

type Phase = 'dsc' | 'disclose';

const MAX_DISCLOSE_RETRIES = 3;
const DISCLOSE_RETRY_DELAY_MS = 3000;
const ERROR_STATES: ProvingStateType[] = ['error', 'failure', 'passport_not_supported', 'passport_data_not_found'];

function mapProvingStateToStep(state: ProvingStateType | null, phase: Phase): ProofGenerationStep {
  if (!state) return 'readingRegistry';

  switch (state) {
    case 'idle':
    case 'parsing_id_document':
    case 'fetching_data':
    case 'validating_document':
      return 'readingRegistry';
    case 'init_tee_connexion':
    case 'ready_to_prove':
    case 'proving':
      return phase === 'dsc' ? 'readingRegistry' : 'generatingProof';
    case 'post_proving':
      return phase === 'disclose' ? 'awaitingVerification' : 'generatingProof';
    case 'completed':
      return phase === 'disclose' ? 'finishingUp' : 'generatingProof';
    default:
      return phase === 'dsc' ? 'readingRegistry' : 'generatingProof';
  }
}

export const TunnelProvingScreen: React.FC = () => {
  const navigate = useNavigate();
  const { client, analytics, haptic } = useSelfClient();
  const verificationCtx = useVerificationRequest();
  const currentState = useProvingStore(s => s.currentState);
  const init = useProvingStore(s => s.init);
  const errorCode = useProvingStore(s => s.error_code);
  const reason = useProvingStore(s => s.reason);

  const [phase, setPhase] = useState<Phase>('dsc');
  const startedRef = useRef(false);
  const retryCountRef = useRef(0);
  const retryTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const navigateToError = useCallback(
    (error: string) => {
      haptic.trigger('error');
      navigate('/tunnel/proof/result', { state: { success: false, error } });
    },
    [haptic, navigate],
  );

  // TODO: replace with actual logic
  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    initSelfAppFromRequest(client, verificationCtx);
    analytics.trackEvent('tunnel_proving_started', { phase: 'dsc' });
    init(client, 'dsc', true);
  }, [client, init, analytics, verificationCtx]);

  useEffect(() => {
    if (!currentState) return;

    const isError = ERROR_STATES.includes(currentState);

    if (isError) {
      // Retry disclose when the commitment tree hasn't updated yet
      if (
        currentState === 'passport_data_not_found' &&
        phase === 'disclose' &&
        retryCountRef.current < MAX_DISCLOSE_RETRIES
      ) {
        retryCountRef.current += 1;
        analytics.trackEvent('tunnel_disclose_retry', { attempt: retryCountRef.current });
        retryTimeoutRef.current = setTimeout(() => init(client, 'disclose', true), DISCLOSE_RETRY_DELAY_MS);
        return;
      }

      analytics.trackEvent('tunnel_proving_failed', {
        phase,
        errorCode,
        reason,
        state: currentState,
      });
      navigateToError(reason ?? errorCode ?? currentState);
      return;
    }

    if (currentState === 'completed' && phase === 'dsc') {
      setPhase('disclose');
      retryCountRef.current = 0;
      analytics.trackEvent('tunnel_proving_dsc_register_complete');
      init(client, 'disclose', true);
    } else if (currentState === 'completed' && phase === 'disclose') {
      analytics.trackEvent('tunnel_proving_disclose_complete');
      haptic.trigger('success');
      navigate('/tunnel/proof/result', { state: { success: true } });
    }
    return () => {
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
        retryTimeoutRef.current = null;
      }
    };
  }, [currentState, phase, client, init, analytics, haptic, navigate, errorCode, reason, navigateToError]);

  return (
    <ProofGenerationScreen
      {...WEB_SAFE_AREA}
      step={mapProvingStateToStep(currentState, phase)}
      idCardProps={MOCK_ID_CARD}
    />
  );
};
