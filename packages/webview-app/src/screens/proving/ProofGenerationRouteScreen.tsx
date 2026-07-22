// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import type React from 'react';
import { useCallback, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

import { ProofProgressScreen, SelfLogo } from '@selfxyz/euclid';
import { useProvingStore } from '@selfxyz/mobile-sdk-alpha/browser';

import type { BridgeError } from '@selfxyz/webview-bridge';

import { useOperatingMode } from '../../providers/OperatingModeProvider';
import { useSelfClient } from '../../providers/SelfClientProvider';
import { useVerificationRequest } from '../../providers/VerificationRequestProvider';
import { WEB_SAFE_AREA } from '../../utils/insets';
import { buildVerificationResult, getDiscloseStep, getFailureState } from '../../utils/provingUtils';
import { initSelfAppFromRequest } from '../../utils/selfAppContext';
import { hasDiscloseRequestContext } from '../../utils/verificationRequest';

export const ProofGenerationRouteScreen: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { client, analytics, lifecycle } = useSelfClient();
  const { mode } = useOperatingMode();
  const verificationCtx = useVerificationRequest();
  const { request, displayLabels, appName, displayAppEndpoint, timestamp, verificationId } = verificationCtx;
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

  // Report the terminal result to the host at PROVING-TERMINAL so the requesting
  // website is notified even if the user closes the app before tapping Continue.
  // DiscloseResultScreen's Continue then dedupes via `resultSent` and only
  // dismisses. Self-app only; embed uses EmbedProvingScreen/EmbedResultScreen.
  const emitTerminalResult = useCallback(
    (success: boolean, error?: BridgeError) => {
      if (mode !== 'self-app') {
        return;
      }
      const result = buildVerificationResult({ success, userId: request.userId, verificationId, error });
      void Promise.resolve(lifecycle.setResult(result)).catch(err => {
        const message = err instanceof Error ? err.message : 'Failed to deliver result';
        analytics.trackEvent('verification_result_callback_failed', { error: message });
      });
    },
    [analytics, lifecycle, mode, request.userId, verificationId],
  );

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
      const failure: BridgeError = { code: 'proof_generation_init_failed', message };
      emitTerminalResult(false, failure);
      navigate(
        { pathname: '/disclose/result', search: location.search },
        {
          replace: true,
          state: {
            success: false,
            error: failure,
            resultSent: true,
          },
        },
      );
    });
  }, [analytics, client, emitTerminalResult, hasValidRequestContext, init, location.search, navigate, verificationCtx]);

  useEffect(() => {
    if (hasNavigatedRef.current) {
      return;
    }

    if (circuitType !== 'disclose') {
      return;
    }

    if (currentState === 'passport_data_not_found') {
      hasNavigatedRef.current = true;
      const failure: BridgeError = {
        code: 'passport_data_not_found',
        message: 'No document found. Please register a document first.',
      };
      emitTerminalResult(false, failure);
      navigate(
        { pathname: '/disclose/result', search: location.search },
        {
          replace: true,
          state: {
            success: false,
            error: failure,
            resultSent: true,
          },
        },
      );
      return;
    }

    if (currentState === 'ready_to_prove' && !hasAutoConfirmedRef.current) {
      hasAutoConfirmedRef.current = true;
      setUserConfirmed(client);
      return;
    }

    if (currentState === 'completed') {
      hasNavigatedRef.current = true;
      emitTerminalResult(true);
      navigate(
        { pathname: '/disclose/result', search: location.search },
        {
          replace: true,
          state: { success: true, resultSent: true },
        },
      );
      return;
    }

    if (currentState === 'error' || currentState === 'failure' || currentState === 'passport_not_supported') {
      hasNavigatedRef.current = true;
      const failure = getFailureState(currentState, errorCode, reason);
      emitTerminalResult(false, failure);
      navigate(
        { pathname: '/disclose/result', search: location.search },
        {
          replace: true,
          state: {
            success: false,
            error: failure,
            resultSent: true,
          },
        },
      );
    }
  }, [circuitType, client, currentState, emitTerminalResult, errorCode, location.search, navigate, reason, setUserConfirmed]);

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
