// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import type React from 'react';
import { useCallback, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

import { StatusState } from '@selfxyz/euclid';
import type { VerificationResult } from '@selfxyz/webview-bridge';

import { useSelfClient } from '../../providers/SelfClientProvider';
import { useVerificationRequest } from '../../providers/VerificationRequestProvider';

interface TunnelResultState {
  success?: boolean;
  error?: string;
}

export const TunnelResultScreen: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { analytics, lifecycle } = useSelfClient();
  const { verificationId, request } = useVerificationRequest();

  const { success = false, error } = (location.state as TunnelResultState) ?? {};
  const resultSentRef = useRef(false);

  useEffect(() => {
    if (!success || resultSentRef.current) return;
    resultSentRef.current = true;

    const result: VerificationResult = {
      success: true,
      userId: request.userId,
      verificationId,
      claims: { resultType: 'proofRequested' },
    };
    lifecycle.setResult(result);
    analytics.trackEvent('tunnel_result_success');
  }, [success, request.userId, verificationId, lifecycle, analytics]);

  useEffect(() => {
    if (success || !error) return;
    analytics.trackEvent('tunnel_result_failure', { error });
  }, [success, error, analytics]);

  const onContinue = useCallback(() => {
    navigate('/');
  }, [navigate]);

  const onRetry = useCallback(() => {
    navigate('/tunnel/proof/generating');
  }, [navigate]);

  const onCancel = useCallback(() => {
    lifecycle.dismiss({ reason: 'back' });
    navigate('/');
  }, [lifecycle, navigate]);

  if (success) {
    return (
      <StatusState
        variant="success"
        title="Identity Verified"
        description="Your identity has been verified. You can now use Self ID to prove your identity to participating partners."
        animationSource="/animations/proof-success.json"
        animationSize={240}
        loopAnimation={false}
        buttonText="Continue"
        onButtonPress={onContinue}
      />
    );
  }

  return (
    <StatusState
      variant="fail"
      title="Verification Failed"
      description={error ?? 'Something went wrong during verification. Please try again.'}
      animationSource="/animations/proof-success.json"
      animationSize={240}
      loopAnimation={false}
      buttonText="Try Again"
      onButtonPress={onRetry}
      secondaryButtonText="Cancel"
      onSecondaryPress={onCancel}
    />
  );
};
