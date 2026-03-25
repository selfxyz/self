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
} from '@selfxyz/euclid';

import { useSelfClient } from '../../providers/SelfClientProvider';
import type { KycProviderResult } from '../../types/kycProvider';

const STATUS_CONFIG = {
  success: {
    variant: 'success' as const,
    title: 'Verification Submitted',
    description:
      'Your identity documents have been submitted for verification. You can continue once the review is complete.',
    buttonText: 'Continue',
  },
  partial: {
    variant: 'success' as const,
    title: 'Verification In Progress',
    description:
      'Your documents have been submitted and are under review. This may take a few minutes.',
    buttonText: 'Continue',
  },
  cancel: {
    variant: 'fail' as const,
    title: 'Verification Cancelled',
    description: 'You cancelled the verification process. You can try again when ready.',
    buttonText: 'Go Back',
  },
  error: {
    variant: 'fail' as const,
    title: 'Verification Failed',
    description: 'Something went wrong during verification. Please try again.',
    buttonText: 'Try Again',
  },
};

export const ProviderResultScreen: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { analytics, haptic, lifecycle } = useSelfClient();

  const { providerResult } =
    (location.state as { providerResult?: KycProviderResult }) || {};

  const status = providerResult?.status ?? 'error';
  const config =
    STATUS_CONFIG[status as keyof typeof STATUS_CONFIG] ?? STATUS_CONFIG.error;
  const isSuccess = status === 'success' || status === 'partial';

  const description =
    status === 'error' && providerResult?.error?.message
      ? providerResult.error.message
      : config.description;

  const onButtonPress = useCallback(() => {
    haptic.trigger('selection');
    analytics.trackEvent('provider_result_action_pressed', { status });

    if (status === 'cancel') {
      lifecycle.dismiss({ reason: 'back' });
      navigate('/');
      return;
    }

    if (status === 'error') {
      const retryable = providerResult?.error?.retryable !== false;
      if (retryable) {
        navigate(-1);
      } else {
        lifecycle.dismiss({ reason: 'back' });
        navigate('/');
      }
      return;
    }

    navigate('/proving');
  }, [analytics, haptic, lifecycle, navigate, providerResult, status]);

  return (
    <StatusState
      variant={config.variant}
      title={config.title}
      description={description}
      buttonText={config.buttonText}
      onButtonPress={onButtonPress}
      icon={
        isSuccess ? (
          <CheckCircleIcon size={64} color={colors.green500} />
        ) : (
          <WarningOctagonIcon size={64} color={colors.red500} />
        )
      }
    />
  );
};
