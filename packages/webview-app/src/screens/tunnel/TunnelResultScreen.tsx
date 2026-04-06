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

interface TunnelResultState {
  success?: boolean;
  error?: string;
  source?: 'proving' | 'disclose';
}

export const TunnelResultScreen: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { analytics, lifecycle } = useSelfClient();
  const { verificationId, request, appName, appEndpoint, timestamp } = useVerificationRequest();

  const { success = false, error, source = 'proving' } = (location.state as TunnelResultState) ?? {};

  useEffect(() => {
    if (success || !error) return;
    analytics.trackEvent('tunnel_result_failure', { error });
  }, [success, error, analytics]);

  const onContinue = useCallback(async () => {
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
  }, [request.userId, verificationId, lifecycle, analytics]);

  const onRetry = useCallback(() => {
    navigate(source === 'disclose' ? '/tunnel/proof/disclose' : '/tunnel/proof/generating');
  }, [navigate, source]);

  const onViewDetails = useCallback(() => {
    navigate('/tunnel/proof/receipt');
  }, [navigate]);

  const onCancel = useCallback(() => {
    lifecycle.dismiss({ reason: 'back' });
    navigate('/');
  }, [lifecycle, navigate]);

  if (success) {
    return (
      <ProofSuccessScreen
        {...WEB_SAFE_AREA}
        appIcon={<SelfLogo size={40} />}
        appName={appName}
        appEndpoint={appEndpoint}
        documentType="passport"
        timestamp={timestamp}
        successTitle="Identity Verified"
        successDescription="Your identity has been verified. You can now use Self ID to prove your identity to participating partners."
        onContinue={onContinue}
        onViewDetails={onViewDetails}
      />
    );
  }

  return (
    <ProofFailureScreen
      {...WEB_SAFE_AREA}
      appIcon={<SelfLogo size={40} />}
      appName={appName}
      appEndpoint={appEndpoint}
      documentType="passport"
      timestamp={timestamp}
      failureTitle="Verification Failed"
      failureDescription={error ?? 'Something went wrong during verification. Please try again.'}
      onRetry={onRetry}
      onViewDetails={onViewDetails}
      onClose={onCancel}
    />
  );
};
