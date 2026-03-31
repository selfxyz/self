// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import type React from 'react';
import { useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

import type { IDCardProps } from '@selfxyz/euclid';
import { ProofGenerationScreen as EuclidProofGenerationScreen } from '@selfxyz/euclid';
import { useProvingStore } from '@selfxyz/mobile-sdk-alpha/browser';

import { useSelfClient } from '../../providers/SelfClientProvider';
import { useVerificationRequest } from '../../providers/VerificationRequestProvider';
import { WEB_SAFE_AREA } from '../../utils/insets';
import { hasDiscloseRequestContext } from '../../utils/verificationRequest';

type ProofGenerationFailureState = {
  code: string;
  message: string;
};

function getGenerationStep(currentState: string) {
  switch (currentState) {
    case 'parsing_id_document':
    case 'fetching_data':
      return 'readingRegistry' as const;
    case 'validating_document':
    case 'init_tee_connexion':
    case 'ready_to_prove':
    case 'proving':
      return 'generatingProof' as const;
    case 'listening_for_status':
      return 'awaitingVerification' as const;
    case 'post_proving':
      return 'finishingUp' as const;
    default:
      return 'readingRegistry' as const;
  }
}

function getFailureState(
  currentState: string,
  code: string | null,
  reason: string | null,
): ProofGenerationFailureState {
  return {
    code: code ?? currentState ?? 'proof_generation_failed',
    message: reason ?? 'The proof request could not be completed.',
  };
}

function getIdCardProps(documentCategory?: string): IDCardProps {
  switch (documentCategory) {
    case 'id_card':
      return { variant: 'id-card', title: 'ID Card', subtitle: 'Verified ID' };
    case 'aadhaar':
      return { variant: 'aadhaar', title: 'Aadhaar', subtitle: 'Verified IN Aadhaar ID' };
    case 'kyc':
      return { variant: 'pending', title: 'KYC Record', subtitle: 'Verification document loaded' };
    case 'passport':
    default:
      return { variant: 'passport', title: 'Passport', subtitle: 'Verified Passport' };
  }
}

export const ProofGenerationRouteScreen: React.FC = () => {
  const navigate = useNavigate();
  const { client, analytics } = useSelfClient();
  const { request, displayLabels } = useVerificationRequest();
  const init = useProvingStore(state => state.init);
  const setUserConfirmed = useProvingStore(state => state.setUserConfirmed);
  const currentState = useProvingStore(state => state.currentState);
  const passportData = useProvingStore(state => state.passportData);
  const errorCode = useProvingStore(state => state.error_code);
  const reason = useProvingStore(state => state.reason);

  const hasValidRequestContext = hasDiscloseRequestContext({ request, displayLabels });
  const hasInitializedRef = useRef(false);
  const hasAutoConfirmedRef = useRef(false);
  const hasNavigatedRef = useRef(false);

  useEffect(() => {
    if (!hasValidRequestContext) {
      navigate('/', { replace: true });
      return;
    }

    if (hasInitializedRef.current) {
      return;
    }

    hasInitializedRef.current = true;
    void init(client, 'disclose').catch(error => {
      if (hasNavigatedRef.current) {
        return;
      }

      hasNavigatedRef.current = true;
      const message = error instanceof Error ? error.message : 'The proof request could not be completed.';
      analytics.trackEvent('prove_generation_init_failed', { error: message });
      navigate('/proving/result', {
        replace: true,
        state: {
          success: false,
          error: {
            code: 'proof_generation_init_failed',
            message,
          },
        },
      });
    });
  }, [analytics, client, hasValidRequestContext, init, navigate]);

  useEffect(() => {
    if (hasNavigatedRef.current) {
      return;
    }

    if (currentState === 'passport_data_not_found') {
      hasNavigatedRef.current = true;
      navigate('/', { replace: true });
      return;
    }

    if (currentState === 'ready_to_prove' && !hasAutoConfirmedRef.current) {
      hasAutoConfirmedRef.current = true;
      setUserConfirmed(client);
      return;
    }

    if (currentState === 'completed') {
      hasNavigatedRef.current = true;
      navigate('/proving/result', {
        replace: true,
        state: { success: true },
      });
      return;
    }

    if (currentState === 'error' || currentState === 'failure' || currentState === 'passport_not_supported') {
      hasNavigatedRef.current = true;
      navigate('/proving/result', {
        replace: true,
        state: {
          success: false,
          error: getFailureState(currentState, errorCode, reason),
        },
      });
    }
  }, [client, currentState, errorCode, navigate, reason, setUserConfirmed]);

  const idCardProps = useMemo(() => getIdCardProps(passportData?.documentCategory), [passportData?.documentCategory]);

  if (!hasValidRequestContext) {
    return null;
  }

  return (
    <EuclidProofGenerationScreen
      {...WEB_SAFE_AREA}
      step={getGenerationStep(currentState ?? 'idle')}
      idCardProps={idCardProps}
    />
  );
};
