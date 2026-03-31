// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import type React from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import type { ProofGenerationStep } from '@selfxyz/euclid';
import { ProofProgressScreen, SelfLogo } from '@selfxyz/euclid';
import type { ProvingStateType } from '@selfxyz/mobile-sdk-alpha/browser';
import { useProvingStore } from '@selfxyz/mobile-sdk-alpha/browser';

import { useSelfClient } from '../../providers/SelfClientProvider';
import { useVerificationRequest } from '../../providers/VerificationRequestProvider';
import { WEB_SAFE_AREA } from '../../utils/insets';
import { initSelfAppFromRequest } from '../../utils/selfAppContext';

const MAX_DISCLOSE_RETRIES = 3;
const DISCLOSE_RETRY_DELAY_MS = 3000;
const ERROR_STATES: ProvingStateType[] = ['error', 'failure', 'passport_not_supported', 'passport_data_not_found'];

function mapDiscloseStateToStep(state: ProvingStateType | null): ProofGenerationStep {
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
      return 'generatingProof';
    case 'post_proving':
      return 'awaitingVerification';
    case 'completed':
      return 'finishingUp';
    default:
      return 'readingRegistry';
  }
}

export const TunnelDiscloseScreen: React.FC = () => {
  const navigate = useNavigate();
  const { client, analytics, haptic } = useSelfClient();
  const verificationCtx = useVerificationRequest();
  const { appName, appEndpoint, timestamp } = verificationCtx;
  const currentState = useProvingStore(s => s.currentState);
  const init = useProvingStore(s => s.init);
  const errorCode = useProvingStore(s => s.error_code);
  const reason = useProvingStore(s => s.reason);

  const startedRef = useRef(false);
  const retryCountRef = useRef(0);
  const retryTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [initDone, setInitDone] = useState(false);
  const [hasCompleted, setHasCompleted] = useState(false);

  const navigateToError = useCallback(
    (error: string) => {
      haptic.trigger('error');
      navigate('/tunnel/proof/result', {
        replace: true,
        state: { success: false, error, source: 'disclose' as const },
      });
    },
    [haptic, navigate],
  );

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    initSelfAppFromRequest(client, verificationCtx);
    analytics.trackEvent('tunnel_disclose_started');
    init(client, 'disclose', true);
    setInitDone(true);
  }, [client, init, analytics, verificationCtx]);

  useEffect(() => {
    if (!currentState || hasCompleted || !initDone) return;

    const isError = ERROR_STATES.includes(currentState);

    if (isError && currentState === 'passport_data_not_found' && retryCountRef.current < MAX_DISCLOSE_RETRIES) {
      retryCountRef.current += 1;
      analytics.trackEvent('tunnel_disclose_retry', { attempt: retryCountRef.current });
      retryTimeoutRef.current = setTimeout(() => init(client, 'disclose', true), DISCLOSE_RETRY_DELAY_MS);
    } else if (isError) {
      analytics.trackEvent('tunnel_disclose_failed', {
        errorCode,
        reason,
        state: currentState,
      });
      navigateToError(reason ?? errorCode ?? currentState);
    } else if (currentState === 'completed') {
      setHasCompleted(true);
      analytics.trackEvent('tunnel_proving_disclose_complete');
      haptic.trigger('success');
      navigate('/tunnel/proof/result', { replace: true, state: { success: true } });
    }

    return () => {
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
        retryTimeoutRef.current = null;
      }
    };
  }, [
    currentState,
    hasCompleted,
    initDone,
    client,
    init,
    analytics,
    haptic,
    navigate,
    errorCode,
    reason,
    navigateToError,
  ]);

  return (
    <ProofProgressScreen
      {...WEB_SAFE_AREA}
      appIcon={<SelfLogo size={40} />}
      appName={appName}
      appEndpoint={appEndpoint}
      documentType="passport"
      timestamp={timestamp}
      step={mapDiscloseStateToStep(currentState)}
    />
  );
};
