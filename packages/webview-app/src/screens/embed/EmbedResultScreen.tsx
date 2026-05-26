// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import type React from 'react';
import { useCallback, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

import { ProofFailureScreen, ProofSuccessScreen, SelfLogo } from '@selfxyz/euclid';
import type { VerificationResult } from '@selfxyz/webview-bridge';

import { useSelfClient } from '../../providers/SelfClientProvider';
import { useVerificationRequest } from '../../providers/VerificationRequestProvider';
import { WEB_SAFE_AREA } from '../../utils/insets';
import { isDemoMode } from '../../utils/mockOnboardingFlow';

interface TunnelResultState {
  success?: boolean;
  error?: string;
  source?: 'disclose' | 'kyc' | 'proving';
}

const getTunnelBackPath = (source: TunnelResultState['source']): string => {
  switch (source) {
    case 'disclose':
      return '/tunnel/proof/disclose';
    case 'kyc':
      return '/tunnel/kyc';
    case 'proving':
    default:
      return '/tunnel/proof/generating';
  }
};

export const EmbedResultScreen: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { analytics, lifecycle } = useSelfClient();
  const { verificationId, request, appName, displayAppEndpoint, timestamp } = useVerificationRequest();

  const { success = false, error, source = 'proving' } = (location.state as TunnelResultState) ?? {};

  useEffect(() => {
    if (success || !error) return;
    analytics.trackEvent('tunnel_result_failure', { error });
  }, [success, error, analytics]);

  const demo = isDemoMode(location.search);

  const handleContinue = useCallback(async () => {
    if (demo) {
      const demoResult: VerificationResult = {
        success: true,
        userId: request.userId,
        verificationId,
        claims: { resultType: 'proofRequested' },
      };
      await lifecycle.setResult(demoResult);
      analytics.trackEvent('tunnel_result_success');
      lifecycle.dismiss();
      return;
    }

    try {
      const result: VerificationResult = {
        success: true,
        userId: request.userId,
        verificationId,
        claims: { resultType: 'proofRequested' },
      };
      await lifecycle.setResult(result);
      analytics.trackEvent('tunnel_result_success');
      lifecycle.dismiss();
    } catch (err) {
      analytics.trackEvent('tunnel_result_failure', {
        error: err instanceof Error ? err.message : 'Failed to send result',
      });
    }
  }, [demo, request.userId, verificationId, lifecycle, analytics]);

  const handleRetry = useCallback(() => {
    navigate(getTunnelBackPath(source), { replace: true });
  }, [navigate, source]);

  const onViewDetails = useCallback(() => {
    navigate('/tunnel/proof/receipt', {
      state: { backPath: location.pathname, backState: location.state },
    });
  }, [location.pathname, location.state, navigate]);

  const handleClose = useCallback(async () => {
    try {
      const result: VerificationResult = {
        success: false,
        userId: request.userId,
        verificationId,
        error: {
          code: 'VERIFICATION_FAILED',
          message: error ?? 'Verification failed',
        },
      };
      await lifecycle.setResult(result);
      analytics.trackEvent('tunnel_result_cancelled', { source });
      lifecycle.dismiss();
    } catch (err) {
      analytics.trackEvent('tunnel_result_cancel_failed', {
        error: err instanceof Error ? err.message : 'Failed to send cancel result',
      });
      lifecycle.dismiss();
    }
  }, [request.userId, verificationId, error, lifecycle, analytics, source]);

  if (success) {
    return (
      <ProofSuccessScreen
        {...WEB_SAFE_AREA}
        appIcon={<SelfLogo size={40} />}
        appName={appName}
        appEndpoint={displayAppEndpoint}
        documentType="passport"
        timestamp={timestamp}
        successTitle="Identity Verified"
        successDescription="Your identity has been verified. You can now use Self ID to prove your identity to participating partners."
        onContinue={handleContinue}
        onViewDetails={onViewDetails}
      />
    );
  }

  return (
    <ProofFailureScreen
      {...WEB_SAFE_AREA}
      appIcon={<SelfLogo size={40} />}
      appName={appName}
      appEndpoint={displayAppEndpoint}
      documentType="passport"
      timestamp={timestamp}
      failureTitle="Verification Failed"
      failureDescription={error ?? 'Something went wrong during verification. Please try again.'}
      onRetry={handleRetry}
      onViewDetails={onViewDetails}
      onClose={handleClose}
    />
  );
};
