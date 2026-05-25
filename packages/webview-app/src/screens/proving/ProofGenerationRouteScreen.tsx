// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import type React from 'react';
import { useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

import { ProofProgressScreen, SelfLogo } from '@selfxyz/euclid';
import { useProvingStore } from '@selfxyz/mobile-sdk-alpha/browser';

import { useSelfClient } from '../../providers/SelfClientProvider';
import { useVerificationRequest } from '../../providers/VerificationRequestProvider';
import { WEB_SAFE_AREA } from '../../utils/insets';
import { getDiscloseStep, getFailureState } from '../../utils/provingUtils';
import { initSelfAppFromRequest } from '../../utils/selfAppContext';
import { hasDiscloseRequestContext } from '../../utils/verificationRequest';

export const ProofGenerationRouteScreen: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { client, analytics } = useSelfClient();
  const verificationCtx = useVerificationRequest();
  const { request, displayLabels, appName, displayAppEndpoint, timestamp } = verificationCtx;
  const init = useProvingStore(state => state.init);
  const setUserConfirmed = useProvingStore(state => state.setUserConfirmed);
  const currentState = useProvingStore(state => state.currentState);
  const circuitType = useProvingStore(state => state.circuitType);
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
    initSelfAppFromRequest(client, verificationCtx);
    void init(client, 'disclose').catch(error => {
      if (hasNavigatedRef.current) {
        return;
      }

      hasNavigatedRef.current = true;
      const message = error instanceof Error ? error.message : 'The proof request could not be completed.';
      analytics.trackEvent('prove_generation_init_failed', { error: message });
      navigate({ pathname: '/proving/result', search: location.search }, {
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
  }, [analytics, client, hasValidRequestContext, init, location.search, navigate, verificationCtx]);

  useEffect(() => {
    if (hasNavigatedRef.current) {
      return;
    }

    if (circuitType !== 'disclose') {
      return;
    }

    if (currentState === 'passport_data_not_found') {
      hasNavigatedRef.current = true;
      navigate({ pathname: '/proving/result', search: location.search }, {
        replace: true,
        state: {
          success: false,
          error: {
            code: 'passport_data_not_found',
            message: 'No document found. Please register a document first.',
          },
        },
      });
      return;
    }

    if (currentState === 'ready_to_prove' && !hasAutoConfirmedRef.current) {
      hasAutoConfirmedRef.current = true;
      setUserConfirmed(client);
      return;
    }

    if (currentState === 'completed') {
      hasNavigatedRef.current = true;
      navigate({ pathname: '/proving/result', search: location.search }, {
        replace: true,
        state: { success: true },
      });
      return;
    }

    if (currentState === 'error' || currentState === 'failure' || currentState === 'passport_not_supported') {
      hasNavigatedRef.current = true;
      navigate({ pathname: '/proving/result', search: location.search }, {
        replace: true,
        state: {
          success: false,
          error: getFailureState(currentState, errorCode, reason),
        },
      });
    }
  }, [circuitType, client, currentState, errorCode, location.search, navigate, reason, setUserConfirmed]);

  if (!hasValidRequestContext) {
    return null;
  }

  return (
    <ProofProgressScreen
      {...WEB_SAFE_AREA}
      appIcon={<SelfLogo size={40} />}
      appName={appName}
      appEndpoint={displayAppEndpoint}
      documentType="passport"
      timestamp={timestamp}
      step={getDiscloseStep(currentState ?? null)}
    />
  );
};
