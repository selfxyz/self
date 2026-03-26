// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import React, { useCallback, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Button, Description, Title, colors, spacing } from '@selfxyz/euclid';

import { useSelfClient } from '../../providers/SelfClientProvider';
import { useVerificationRequest } from '../../providers/VerificationRequestProvider';
import type { MockOnboardingNavigationState } from '../../utils/mockOnboardingFlow';
import {
  createMockProviderResult,
  getMockOutcomeFromSearch,
  getMockOutcomeSearch,
} from '../../utils/mockOnboardingFlow';

export const ProviderLaunchScreen: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { analytics, haptic, lifecycle } = useSelfClient();
  const { verificationId } = useVerificationRequest();
  const mockOutcome = getMockOutcomeFromSearch(location.search);

  const { countryCode = '', documentType = '' } =
    (location.state as MockOnboardingNavigationState | null) ?? {};

  useEffect(() => {
    if (!countryCode || !documentType) {
      navigate('/onboarding/country', { replace: true });
      return;
    }

    analytics.trackEvent('provider_launch_started', {
      countryCode,
      documentType,
      mockOutcome,
    });

    const timer = window.setTimeout(() => {
      const providerResult = createMockProviderResult({
        outcome: mockOutcome,
        verificationId,
      });

      analytics.trackEvent('provider_mock_completed', {
        status: providerResult.status,
        mockOutcome,
      });

      navigate(`/onboarding/provider-result${getMockOutcomeSearch(mockOutcome)}`, {
        replace: true,
        state: {
          providerResult,
          countryCode,
          documentType,
          retryMockOutcome: mockOutcome,
        },
      });
    }, 700);

    return () => window.clearTimeout(timer);
  }, [
    analytics,
    countryCode,
    documentType,
    mockOutcome,
    navigate,
    verificationId,
  ]);

  const handleBack = useCallback(() => {
    haptic.trigger('selection');
    analytics.trackEvent('provider_launch_back_pressed', {
      countryCode,
      documentType,
      mockOutcome,
    });
    lifecycle.dismiss({ reason: 'back' });
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate('/', { state: { skipOnboardingRedirect: true } });
    }
  }, [analytics, countryCode, documentType, haptic, lifecycle, mockOutcome, navigate]);

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: colors.white,
      }}
    >
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: spacing.lg,
          flex: 1,
          gap: spacing.md,
        }}
      >
        <div
          style={{
            width: 40,
            height: 40,
            border: `3px solid ${colors.slate300}`,
            borderTopColor: colors.black,
            borderRadius: '50%',
            animation: 'spin 0.8s linear infinite',
          }}
        />
        <Title textAlign="center">Launching verification</Title>
        <Description textAlign="center">
          Preparing the mocked provider handoff for your registration flow.
        </Description>
        <Button
          variant="secondary-label"
          text="Back"
          fullWidth
          onPress={handleBack}
        />
      </div>
    </div>
  );
};
