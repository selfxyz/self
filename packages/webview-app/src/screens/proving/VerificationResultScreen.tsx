// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import type React from 'react';
import { useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

import { colors, StatusState, WarningOctagonIcon } from '@selfxyz/euclid';
import type { VerificationResult } from '@selfxyz/webview-bridge';

import { useResolvedContractError } from '../../hooks/useResolvedContractError';
import { useSelfClient } from '../../providers/SelfClientProvider';
import { WEB_SAFE_AREA } from '../../utils/insets';

export const VerificationResultScreen: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { analytics, haptic, lifecycle } = useSelfClient();

  const {
    success = true,
    error,
    result,
    resultSent = true,
  } = (location.state as {
    success?: boolean;
    error?: string;
    result?: VerificationResult;
    resultSent?: boolean;
  }) || {};
  const resolvedError = useResolvedContractError(error);

  const onContinue = useCallback(async () => {
    haptic.trigger('selection');
    if (!resultSent && result) {
      try {
        await lifecycle.setResult(result);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to deliver result';
        analytics.trackEvent('verification_result_callback_failed', {
          error: message,
        });
      }
    } else if (!resultSent) {
      lifecycle.dismiss();
    }
    navigate('/');
  }, [analytics, haptic, lifecycle, navigate, result, resultSent]);

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
        title={success ? 'ID Verified' : 'Verification Failed'}
        description={
          success
            ? "Your document's information is now protected by Self ID. Just scan a participating partner's QR code to prove your identity."
            : (resolvedError ?? 'Something went wrong during verification. Please try again.')
        }
        animationSource={success ? '/animations/proof-success.json' : undefined}
        animationSize={240}
        loopAnimation={false}
        buttonText="Continue"
        onButtonPress={onContinue}
        icon={success ? undefined : <WarningOctagonIcon size={64} color={colors.red500} />}
      />
    </div>
  );
};
