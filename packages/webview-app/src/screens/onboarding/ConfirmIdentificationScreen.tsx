// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import type React from 'react';
import { useCallback, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

import { StatusState } from '@selfxyz/euclid';
import type { VerificationResult } from '@selfxyz/webview-bridge';

import { MockRegistrationFailureButton } from '../../components/MockRegistrationFailureButton';
import { useSelfClient } from '../../providers/SelfClientProvider';
import { useVerificationRequest } from '../../providers/VerificationRequestProvider';
import { WEB_SAFE_AREA } from '../../utils/insets';

export const ConfirmIdentificationScreen: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { analytics, haptic, lifecycle } = useSelfClient();
  const { request, verificationId } = useVerificationRequest();
  const { nextPath, countryCode, documentType } =
    (location.state as { nextPath?: string; countryCode?: string; documentType?: string } | null) ?? {};

  useEffect(() => {
    haptic.trigger('success');
  }, [haptic]);

  const onConfirm = useCallback(async () => {
    if (nextPath) {
      haptic.trigger('selection');
      analytics.trackEvent('ownership_confirmed', { nextPath });
      navigate(nextPath, { replace: true, state: { countryCode, documentType } });
      return;
    }

    const result: VerificationResult = {
      success: true,
      userId: request.userId,
      verificationId,
      claims: {
        resultType: 'documentOwnershipConfirmed',
      },
    };

    haptic.trigger('selection');
    analytics.trackEvent('ownership_confirmed');

    try {
      await lifecycle.setResult(result);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      analytics.trackEvent('proving_process_error', { error: message });
    }

    navigate('/');
  }, [analytics, countryCode, documentType, haptic, lifecycle, navigate, nextPath, request.userId, verificationId]);

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
      <MockRegistrationFailureButton />
      <StatusState
        variant="success"
        title="Confirm your identity"
        description="By continuing, you certify that this passport, biometric ID or Aadhaar card belongs to you and is not stolen or forged. Once registered with Self, this document will be permanently linked to your identity and can't be linked to another one."
        animationSource="/animations/proof-success.json"
        animationSize={240}
        loopAnimation={false}
        buttonText="Confirm"
        onButtonPress={onConfirm}
      />
    </div>
  );
};
