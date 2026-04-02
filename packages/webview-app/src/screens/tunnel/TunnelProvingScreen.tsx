// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import type React from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import type { ProofGenerationStep } from '@selfxyz/euclid';
import { ProofGenerationScreen } from '@selfxyz/euclid';
import type { ProvingStateType } from '@selfxyz/mobile-sdk-alpha/browser';
import { loadSelectedDocument, useProvingStore } from '@selfxyz/mobile-sdk-alpha/browser';

import { useSelfClient } from '../../providers/SelfClientProvider';
import { useVerificationRequest } from '../../providers/VerificationRequestProvider';
import { WEB_SAFE_AREA } from '../../utils/insets';
import { getIdCardProps } from '../../utils/provingUtils';
import { initSelfAppFromRequest } from '../../utils/selfAppContext';

type Phase = 'dsc' | 'register' | 'disclose';

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

  const passportData = useProvingStore(s => s.passportData);
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

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    initSelfAppFromRequest(client, verificationCtx);

    const start = async () => {
      const selectedDocument = await loadSelectedDocument(client);
      const category = selectedDocument?.data?.documentCategory;
      const initialPhase: Phase = category === 'aadhaar' || category === 'kyc' ? 'register' : 'dsc';
      setPhase(initialPhase);
      analytics.trackEvent('tunnel_proving_started', { phase: initialPhase });
      init(client, initialPhase, true);
    };
    start();
  }, [client, init, analytics, verificationCtx]);

  useEffect(() => {
    if (!currentState) return;

    const isError = ERROR_STATES.includes(currentState);

    if (
      isError &&
      currentState === 'passport_data_not_found' &&
      phase === 'disclose' &&
      retryCountRef.current < MAX_DISCLOSE_RETRIES
    ) {
      retryCountRef.current += 1;
      analytics.trackEvent('tunnel_disclose_retry', { attempt: retryCountRef.current });
      retryTimeoutRef.current = setTimeout(() => init(client, 'disclose', true), DISCLOSE_RETRY_DELAY_MS);
    } else if (isError) {
      analytics.trackEvent('tunnel_proving_failed', {
        phase,
        errorCode,
        reason,
        state: currentState,
      });
      navigateToError(reason ?? errorCode ?? currentState);
    } else if (currentState === 'completed' && phase !== 'disclose') {
      setPhase('disclose');
      retryCountRef.current = 0;
      analytics.trackEvent('tunnel_proving_registration_complete', { previousPhase: phase });
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
      idCardProps={getIdCardProps(passportData?.documentCategory)}
    />
  );
};
