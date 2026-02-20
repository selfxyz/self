// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import React, { useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  StatusState,
  CheckCircleIcon,
  WarningOctagonIcon,
  colors,
} from '@selfxyz/euclid-web';

import { useSelfClient } from '../../providers/SelfClientProvider';

export const VerificationResultScreen: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { haptic } = useSelfClient();

  const { success = true, error } =
    (location.state as {
      success?: boolean;
      error?: string;
    }) || {};

  const onContinue = useCallback(() => {
    haptic.trigger('selection');
    navigate('/');
  }, [navigate, haptic]);

  return (
    <StatusState
      variant={success ? 'success' : 'fail'}
      title={success ? 'ID Verified' : 'Verification Failed'}
      description={
        success
          ? "Your document's information is now protected by Self ID. Just scan a participating partner's QR code to prove your identity."
          : (error ??
            'Something went wrong during verification. Please try again.')
      }
      buttonText="Continue"
      onButtonPress={onContinue}
      icon={
        success ? (
          <CheckCircleIcon size={64} color={colors.green500} />
        ) : (
          <WarningOctagonIcon size={64} color={colors.red500} />
        )
      }
    />
  );
};
