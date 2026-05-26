// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import type React from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

import type { ProofGenerationStep } from '@selfxyz/euclid';
import { ProofGenerationScreen } from '@selfxyz/euclid';
import type { ProvingStateType } from '@selfxyz/mobile-sdk-alpha/browser';
import {
  loadSelectedDocument,
  markCurrentDocumentAsRegistered,
  useProvingStore,
} from '@selfxyz/mobile-sdk-alpha/browser';

import { useSelfClient } from '../../providers/SelfClientProvider';
import { WEB_SAFE_AREA } from '../../utils/insets';
import { getIdCardProps } from '../../utils/provingUtils';

type Phase = 'dsc' | 'register';

const ERROR_STATES: ProvingStateType[] = ['error', 'failure', 'passport_not_supported', 'passport_data_not_found'];

function mapState(state: ProvingStateType | null, phase: Phase): ProofGenerationStep {
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
      return 'finishingUp';
    case 'completed':
      return 'finishingUp';
    default:
      return phase === 'dsc' ? 'readingRegistry' : 'generatingProof';
  }
}

interface RegisteringLocationState {
  documentCategory?: string;
  mock?: boolean;
}

export const RegisteringScreen: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { client, analytics, haptic } = useSelfClient();
  // Caller (e.g. DevModeScreen) can pass the document identity in nav state
  // so we render the right IDCard variant immediately, with no flicker while
  // loadSelectedDocument() resolves.
  const navState = (location.state as RegisteringLocationState | null) ?? null;
  const currentState = useProvingStore(s => s.currentState);
  const init = useProvingStore(s => s.init);
  const circuitType = useProvingStore(s => s.circuitType);
  const errorCode = useProvingStore(s => s.error_code);
  const reason = useProvingStore(s => s.reason);
  const passportData = useProvingStore(s => s.passportData);

  const [phase, setPhase] = useState<Phase>('dsc');
  // The proving machine resets `passportData` between dsc and register
  // phases, which makes idCardProps derived from it flicker mid-flow. Capture
  // the document identity once at mount and reuse — it doesn't change for
  // the duration of a single registration.
  const [docIdentity, setDocIdentity] = useState<{
    category?: string;
    mock?: boolean;
  } | null>(
    navState?.documentCategory !== undefined || navState?.mock !== undefined
      ? { category: navState.documentCategory, mock: navState.mock }
      : null,
  );
  const startedRef = useRef(false);
  const finishedRef = useRef(false);

  const goHomeRegistered = useCallback(async () => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    try {
      await markCurrentDocumentAsRegistered(client);
    } catch {
      // proving machine also fires this; HomeScreen will re-fetch on next mount
    }
    haptic.trigger('success');
    analytics.trackEvent('onboarding_register_completed');
    navigate('/', { replace: true, state: { skipOnboardingRedirect: true } });
  }, [analytics, client, haptic, navigate]);

  const goFailure = useCallback(
    (error: string) => {
      if (finishedRef.current) return;
      finishedRef.current = true;
      haptic.trigger('error');
      analytics.trackEvent('onboarding_register_failed', { error });
      navigate('/register/failure', { replace: true, state: { error } });
    },
    [analytics, haptic, navigate],
  );

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    (async () => {
      const selectedDocument = await loadSelectedDocument(client);
      const category = selectedDocument?.data?.documentCategory;
      setDocIdentity({ category, mock: selectedDocument?.data?.mock === true });
      const initialPhase: Phase = category === 'aadhaar' || category === 'kyc' ? 'register' : 'dsc';
      setPhase(initialPhase);
      analytics.trackEvent('onboarding_register_started', { phase: initialPhase });
      await Promise.resolve(init(client, initialPhase, true));
    })().catch(err => {
      const message = err instanceof Error ? err.message : 'register init failed';
      goFailure(message);
    });
  }, [analytics, client, init, goFailure]);

  useEffect(() => {
    if (circuitType === 'register' && phase !== 'register') {
      setPhase('register');
    }
  }, [circuitType, phase]);

  useEffect(() => {
    if (!currentState) return;
    if (ERROR_STATES.includes(currentState)) {
      goFailure(reason ?? errorCode ?? currentState);
      return;
    }
    if (currentState === 'completed' && circuitType === 'register') {
      goHomeRegistered();
    }
  }, [currentState, circuitType, errorCode, reason, goHomeRegistered, goFailure]);

  return (
    <ProofGenerationScreen
      {...WEB_SAFE_AREA}
      step={mapState(currentState, phase)}
      idCardProps={getIdCardProps(
        docIdentity?.category ?? passportData?.documentCategory,
        docIdentity?.mock ?? passportData?.mock === true,
      )}
      lottieSource="/animations/proof-progress.json"
    />
  );
};
