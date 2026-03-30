// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import type React from 'react';
import { useEffect, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

import { colors, Description, spacing, Title } from '@selfxyz/euclid';

import { MockRegistrationFailureButton } from '../../components/MockRegistrationFailureButton';
import { useSelfClient } from '../../providers/SelfClientProvider';
import { setKycResult } from '../../stores/kycResultStore';
import type { KycProviderResult } from '../../types/kycProvider';
import type { MockOnboardingNavigationState } from '../../utils/mockOnboardingFlow';
import { createMockProviderResult, getMockOutcomeFromSearch } from '../../utils/mockOnboardingFlow';

export const ProviderResultScreen: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { analytics, haptic, lifecycle } = useSelfClient();
  const mockOutcome = getMockOutcomeFromSearch(location.search);
  const state =
    (location.state as ({ providerResult?: KycProviderResult } & MockOnboardingNavigationState) | null) ?? null;

  // Use real provider result if available, otherwise fall back to mock for dev testing
  const providerResult = useMemo(
    () => state?.providerResult ?? createMockProviderResult({ outcome: mockOutcome }),
    [state?.providerResult, mockOutcome],
  );
  const isRealResult = !!state?.providerResult;

  useEffect(() => {
    haptic.trigger('selection');
    analytics.trackEvent('provider_result_received', {
      status: providerResult.status,
      hasAttestation: !!providerResult.attestation,
      isRealResult,
      mockOutcome,
    });

    const timer = window.setTimeout(() => {
      // Real result with attestation: store and route to confirm
      if (providerResult.status === 'success' && providerResult.attestation) {
        setKycResult(providerResult);
        navigate('/onboarding/confirm', { replace: true });
        return;
      }

      // Contract violation per WV-02: success requires attestation
      if (providerResult.status === 'success' && !providerResult.attestation) {
        analytics.trackEvent('provider_result_missing_attestation');
        // Mock flow: route through confirm for dev testing only
        if (!isRealResult && import.meta.env.DEV) {
          navigate('/onboarding/confirm', {
            replace: true,
            state: {
              nextPath: '/onboarding/success',
              countryCode: state?.countryCode,
              documentType: state?.documentType,
            },
          });
          return;
        }
        navigate('/onboarding/kyc-failure', {
          replace: true,
          state: { retryable: true },
        });
        return;
      }

      // Partial results cannot advance into proving per WV-02 contract
      if (providerResult.status === 'partial') {
        analytics.trackEvent('provider_result_partial');
        navigate('/onboarding/kyc-failure', {
          replace: true,
          state: { retryable: true },
        });
        return;
      }

      if (providerResult.status === 'cancel') {
        lifecycle.dismiss({ reason: 'back' });
        if (window.history.length > 1) {
          navigate(-1);
        } else {
          navigate('/', { replace: true, state: { skipOnboardingRedirect: true } });
        }
        return;
      }

      // Error states
      if (providerResult.error?.retryable !== false) {
        navigate('/onboarding/kyc-failure', {
          replace: true,
          state: {
            countryCode: state?.countryCode,
            documentType: state?.documentType,
            retryMockOutcome: mockOutcome,
          },
        });
        return;
      }

      navigate('/onboarding/failure', { replace: true });
    }, 450);

    return () => window.clearTimeout(timer);
  }, [
    analytics,
    haptic,
    isRealResult,
    lifecycle,
    mockOutcome,
    navigate,
    providerResult,
    state?.countryCode,
    state?.documentType,
  ]);

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.white,
        padding: spacing.lg,
      }}
    >
      <MockRegistrationFailureButton />
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: spacing.md,
          maxWidth: 420,
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
        <Title textAlign="center">Processing verification result</Title>
        <Description textAlign="center">Verifying your identity documents...</Description>
      </div>
    </div>
  );
};
