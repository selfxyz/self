// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import type React from 'react';
import { useCallback, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

import { colors, StatusState, WarningOctagonIcon } from '@selfxyz/euclid';
import type { BridgeError, VerificationResult } from '@selfxyz/webview-bridge';

import { useSelfClient } from '../../providers/SelfClientProvider';
import { useVerificationRequest } from '../../providers/VerificationRequestProvider';
import { WEB_SAFE_AREA } from '../../utils/insets';

interface VerificationResultLocationState {
  success?: boolean;
  error?: BridgeError | string;
  resultSent?: boolean;
}

function normalizeError(error: BridgeError | string | undefined): BridgeError | undefined {
  if (!error) {
    return undefined;
  }
  if (typeof error === 'string') {
    return {
      code: 'proof_generation_failed',
      message: error,
    };
  }
  return error;
}

export const VerificationResultScreen: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { analytics, haptic, lifecycle } = useSelfClient();
  const { request, verificationId } = useVerificationRequest();

  const {
    success = true,
    error,
    resultSent = false,
  } = (location.state as VerificationResultLocationState | null) ?? {};
  const normalizedError = normalizeError(error);
  const result = useMemo<VerificationResult>(
    () =>
      success
        ? {
            success: true,
            userId: request.userId,
            verificationId,
            claims: {
              resultType: 'proofRequested',
            },
          }
        : {
            success: false,
            userId: request.userId,
            verificationId,
            claims: {
              resultType: 'proofRequested',
            },
            error: normalizedError ?? {
              code: 'proof_generation_failed',
              message: 'The proof request could not be completed.',
            },
          },
    [normalizedError, request.userId, success, verificationId],
  );

  const onContinue = useCallback(async () => {
    haptic.trigger('selection');
    let hasDeliveredResult = resultSent;

    if (!resultSent && result) {
      try {
        await lifecycle.setResult(result);
        hasDeliveredResult = true;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to deliver result';
        analytics.trackEvent('verification_result_callback_failed', {
          error: message,
        });
      }
    }

    if (success) {
      if (hasDeliveredResult) {
        await lifecycle.dismiss();
      }
      navigate('/', { replace: true });
      return;
    }

    navigate('/proving', { replace: true });
  }, [analytics, haptic, lifecycle, navigate, result, resultSent, success]);

  return (
    <div
      style={{
        display: 'flex',
        flex: 1,
        minHeight: 0,
        paddingTop: WEB_SAFE_AREA.insets.top,
        paddingBottom: WEB_SAFE_AREA.insets.bottom,
      }}
    >
      <StatusState
        variant={success ? 'success' : 'fail'}
        title={success ? 'Proof Generated' : 'Proof Generation Failed'}
        description={
          success
            ? 'Your identity was shared successfully for this request.'
            : (normalizedError?.message ?? 'The proof request could not be completed. Please try again.')
        }
        animationSource={success ? '/animations/proof-success.json' : undefined}
        animationSize={240}
        loopAnimation={false}
        buttonText={success ? 'Done' : 'Try Again'}
        onButtonPress={onContinue}
        icon={success ? undefined : <WarningOctagonIcon size={64} color={colors.red500} />}
      />
    </div>
  );
};
