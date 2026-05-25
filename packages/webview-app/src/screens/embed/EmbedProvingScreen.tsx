// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import type React from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

import type { ProofGenerationStep } from '@selfxyz/euclid';
import { ProofGenerationScreen } from '@selfxyz/euclid';
import type { ProvingStateType } from '@selfxyz/mobile-sdk-alpha/browser';
import { loadSelectedDocument, useProvingStore } from '@selfxyz/mobile-sdk-alpha/browser';

import { useSelfClient } from '../../providers/SelfClientProvider';
import { useVerificationRequest } from '../../providers/VerificationRequestProvider';
import { WEB_SAFE_AREA } from '../../utils/insets';
import { isDemoMode } from '../../utils/mockOnboardingFlow';
import { getIdCardProps } from '../../utils/provingUtils';
import { initSelfAppFromRequest } from '../../utils/selfAppContext';

const DEMO_PROVING_STEPS: ProofGenerationStep[] = ['readingRegistry', 'generatingProof'];

const DemoEmbedProvingScreen: React.FC<{ search: string }> = ({ search }) => {
  const navigate = useNavigate();
  const [stepIndex, setStepIndex] = useState(0);

  const advance = useCallback(() => {
    if (stepIndex < DEMO_PROVING_STEPS.length - 1) {
      setStepIndex(i => i + 1);
    } else {
      navigate(`/tunnel/proof/disclose${search}`, { replace: true });
    }
  }, [stepIndex, navigate, search]);

  return (
    <div
      style={{
        width: '100vw',
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <ProofGenerationScreen
        {...WEB_SAFE_AREA}
        step={DEMO_PROVING_STEPS[stepIndex]}
        lottieSource="/animations/proof-progress.json"
      />
      <div onClick={advance} style={{ position: 'absolute', inset: 0, zIndex: 1, cursor: 'pointer' }} />
    </div>
  );
};

type Phase = 'dsc' | 'register';

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
    case 'completed':
      return 'generatingProof';
    default:
      return phase === 'dsc' ? 'readingRegistry' : 'generatingProof';
  }
}

const StandardEmbedProvingScreen: React.FC = () => {
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
  const [initDone, setInitDone] = useState(false);

  const navigateToError = useCallback(
    (error: string) => {
      haptic.trigger('error');
      navigate('/tunnel/proof/result', { replace: true, state: { success: false, error, source: 'proving' as const } });
    },
    [haptic, navigate],
  );

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;

    const start = async () => {
      initSelfAppFromRequest(client, verificationCtx);
      const selectedDocument = await loadSelectedDocument(client);
      const category = selectedDocument?.data?.documentCategory;
      const initialPhase: Phase = category === 'aadhaar' || category === 'kyc' ? 'register' : 'dsc';
      setPhase(initialPhase);
      analytics.trackEvent('tunnel_proving_started', { phase: initialPhase });
      await Promise.resolve(init(client, initialPhase, true));
      setInitDone(true);
    };
    start().catch(err => {
      const message = err instanceof Error ? err.message : 'Proving init failed';
      analytics.trackEvent('tunnel_proving_init_failed', { error: message });
      navigateToError(message);
    });
  }, [client, init, analytics, verificationCtx, navigateToError]);

  useEffect(() => {
    if (!currentState || !initDone) return;

    if (currentState === 'account_recovery_choice') {
      analytics.trackEvent('tunnel_recovery_required');
      navigate('/tunnel/recovery-required', { replace: true });
      return;
    }

    const isError = ERROR_STATES.includes(currentState);

    if (isError) {
      analytics.trackEvent('tunnel_proving_failed', {
        phase,
        errorCode,
        reason,
        state: currentState,
      });
      navigateToError(reason ?? errorCode ?? currentState);
    } else if (currentState === 'completed') {
      analytics.trackEvent('tunnel_proving_registration_complete', { previousPhase: phase });
      // Brief delay to allow tree reader to index the on-chain commitment
      // before disclose fetches the identity tree.
      setTimeout(() => navigate('/tunnel/proof/disclose', { replace: true }), 5000);
    }
  }, [currentState, initDone, phase, analytics, haptic, navigate, errorCode, reason, navigateToError]);

  return (
    <ProofGenerationScreen
      {...WEB_SAFE_AREA}
      step={mapProvingStateToStep(currentState, phase)}
      idCardProps={getIdCardProps(passportData?.documentCategory, passportData?.mock === true)}
      lottieSource="/animations/proof-progress.json"
    />
  );
};

export const EmbedProvingScreen: React.FC = () => {
  const location = useLocation();

  if (isDemoMode(location.search)) {
    return <DemoEmbedProvingScreen search={location.search} />;
  }

  return <StandardEmbedProvingScreen />;
};
