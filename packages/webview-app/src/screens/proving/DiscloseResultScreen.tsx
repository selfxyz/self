// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import type React from 'react';
import { useCallback, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

import { ProofFailureScreen, ProofSuccessScreen, SelfLogo } from '@selfxyz/euclid';
import type { BridgeError, VerificationResult } from '@selfxyz/webview-bridge';

import { SupportReference } from '../../components/SupportReference';
import { useSelfClient } from '../../providers/SelfClientProvider';
import { useVerificationRequest } from '../../providers/VerificationRequestProvider';
import { WEB_SAFE_AREA } from '../../utils/insets';
import { normalizeError } from '../../utils/provingUtils';

interface DiscloseResultLocationState {
  success?: boolean;
  error?: BridgeError | string;
  resultSent?: boolean;
}

export const DiscloseResultScreen: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { analytics, haptic, lifecycle } = useSelfClient();
  const { request, verificationId, appName, displayAppEndpoint, timestamp } = useVerificationRequest();

  const { success = true, error, resultSent = false } = (location.state as DiscloseResultLocationState | null) ?? {};
  const normalizedError = normalizeError(error);
  const result = useMemo<VerificationResult>(
    () =>
      success
        ? {
            success: true,
            userId: request.userId,
            verificationId,
            claims: { resultType: 'proofRequested' },
          }
        : {
            success: false,
            userId: request.userId,
            verificationId,
            claims: { resultType: 'proofRequested' },
            error: normalizedError ?? {
              code: 'proof_generation_failed',
              message: 'The proof request could not be completed.',
            },
          },
    [normalizedError, request.userId, success, verificationId],
  );

  const deliverResult = useCallback(async () => {
    if (resultSent) return true;
    try {
      await lifecycle.setResult(result);
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to deliver result';
      analytics.trackEvent('verification_result_callback_failed', { error: message });
      return false;
    }
  }, [analytics, lifecycle, result, resultSent]);

  const handleContinue = useCallback(async () => {
    haptic.trigger('selection');
    const delivered = await deliverResult();
    if (delivered) {
      await lifecycle.dismiss();
    }
    navigate('/', { replace: true });
  }, [deliverResult, haptic, lifecycle, navigate]);

  const handleRetry = useCallback(() => {
    haptic.trigger('selection');
    navigate({ pathname: '/disclose/request', search: location.search }, { replace: true });
  }, [haptic, location.search, navigate]);

  const onViewDetails = useCallback(() => {
    haptic.trigger('selection');
    navigate({ pathname: '/receipts/current', search: location.search });
  }, [haptic, location.search, navigate]);

  // userId is the wallet address when userIdType=hex (real Playground sends
  // either a hex address or a uuid; only display when it's clearly an address).
  const walletAddress = request.userId?.startsWith('0x') ? request.userId : undefined;

  if (success) {
    return (
      <ProofSuccessScreen
        {...WEB_SAFE_AREA}
        appIcon={<SelfLogo size={40} />}
        appName={appName}
        appEndpoint={displayAppEndpoint}
        documentType="passport"
        timestamp={timestamp}
        walletAddress={walletAddress}
        successTitle="Proof Generated"
        successDescription="Your identity was shared successfully for this request."
        onViewDetails={onViewDetails}
        onContinue={handleContinue}
      />
    );
  }

  return (
    <>
      <ProofFailureScreen
        {...WEB_SAFE_AREA}
        appIcon={<SelfLogo size={40} />}
        appName={appName}
        appEndpoint={displayAppEndpoint}
        documentType="passport"
        timestamp={timestamp}
        walletAddress={walletAddress}
        failureTitle="Proof Generation Failed"
        failureDescription={normalizedError?.message ?? 'The proof request could not be completed. Please try again.'}
        onClose={handleContinue}
        onRetry={handleRetry}
        onViewDetails={onViewDetails}
      />
      <SupportReference />
    </>
  );
};
