// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import type React from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

import { Button, colors, Description, spacing, Title } from '@selfxyz/euclid';

import { useSelfClient } from '../../providers/SelfClientProvider';
import { useVerificationRequest } from '../../providers/VerificationRequestProvider';
import type { KycProviderResult } from '../../types/kycProvider';
import { fetchSumsubAccessToken, launchSumsubWebSdk } from '../../utils/sumsubProvider';

const CONTAINER_ID = 'sumsub-websdk-container';

type Phase = 'loading' | 'active' | 'error';

export const ProviderLaunchScreen: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { analytics, haptic, lifecycle } = useSelfClient();
  const { verificationId: ctxVerificationId } = useVerificationRequest();

  const { countryCode = '', documentType = '' } =
    (location.state as {
      countryCode?: string;
      documentType?: string;
    }) || {};

  const verificationId = ctxVerificationId;

  const [phase, setPhase] = useState<Phase>(!verificationId ? 'error' : 'loading');
  const [errorMessage, setErrorMessage] = useState(!verificationId ? 'Missing verification context' : '');
  const [retryCount, setRetryCount] = useState(0);
  const destroyRef = useRef<(() => void) | null>(null);
  const mountedRef = useRef(true);

  const handleComplete = useCallback(
    (result: KycProviderResult) => {
      if (!mountedRef.current) return;
      analytics.trackEvent('provider_complete', {
        status: result.status,
        provider: result.provider,
      });
      navigate('/onboarding/provider-result', {
        state: { providerResult: result },
      });
    },
    [analytics, navigate],
  );

  const handleError = useCallback(
    (result: KycProviderResult) => {
      if (!mountedRef.current) return;
      analytics.trackEvent('provider_error', {
        status: result.status,
        errorCode: result.error?.code,
        provider: result.provider,
      });
      navigate('/onboarding/provider-result', {
        state: { providerResult: result },
      });
    },
    [analytics, navigate],
  );

  useEffect(() => {
    if (!verificationId) {
      setPhase('error');
      setErrorMessage('Missing verification context');
      return;
    }

    mountedRef.current = true;

    analytics.trackEvent('provider_launch_started', {
      countryCode,
      documentType,
    });

    let cancelled = false;
    const controller = new AbortController();

    (async () => {
      try {
        const { token } = await fetchSumsubAccessToken(controller.signal);
        if (cancelled) return;

        const destroy = await launchSumsubWebSdk({
          accessToken: token,
          containerId: CONTAINER_ID,
          verificationId,
          onComplete: handleComplete,
          onError: handleError,
          onMessage: (type, payload) => {
            analytics.trackEvent('provider_message', {
              messageType: type,
              hasPayload: payload != null,
            });
          },
        });

        if (cancelled) {
          destroy();
          return;
        }

        destroyRef.current = destroy;
        setPhase('active');
      } catch (err) {
        if (cancelled) return;
        const message = err instanceof Error ? err.message : 'Failed to launch provider';
        analytics.trackEvent('provider_launch_failed', { error: message });
        setPhase('error');
        setErrorMessage(message);
      }
    })();

    return () => {
      cancelled = true;
      mountedRef.current = false;
      controller.abort();
      destroyRef.current?.();
      destroyRef.current = null;
    };
  }, [analytics, countryCode, documentType, handleComplete, handleError, verificationId, retryCount]);

  const handleBack = useCallback(() => {
    haptic.trigger('selection');
    analytics.trackEvent('provider_launch_back_pressed', {
      countryCode,
      documentType,
    });
    lifecycle.dismiss({ reason: 'back' });
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate('/');
    }
  }, [analytics, countryCode, documentType, haptic, lifecycle, navigate]);

  const handleRetry = useCallback(() => {
    haptic.trigger('selection');
    analytics.trackEvent('provider_launch_retry_pressed');
    setPhase('loading');
    setErrorMessage('');
    setRetryCount(c => c + 1);
  }, [haptic, analytics]);

  if (phase === 'error') {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: spacing.lg,
          backgroundColor: colors.slate50,
        }}
      >
        <div
          style={{
            width: '100%',
            maxWidth: 420,
            backgroundColor: colors.white,
            borderRadius: 24,
            padding: spacing.xl,
            display: 'flex',
            flexDirection: 'column',
            gap: spacing.md,
            alignItems: 'center',
            textAlign: 'center',
          }}
        >
          <Title textAlign="center">Unable to launch verification</Title>
          <Description>{errorMessage}</Description>
          <div
            style={{
              width: '100%',
              display: 'flex',
              flexDirection: 'column',
              gap: spacing.sm,
            }}
          >
            <Button variant="secondary-label" text="Try Again" fullWidth onPress={handleRetry} />
            <Button variant="secondary-label" text="Back" fullWidth onPress={handleBack} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: colors.white,
      }}
    >
      {phase === 'loading' && (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: spacing.lg,
            flex: 1,
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
          <div style={{ marginTop: spacing.md }}>
            <Title textAlign="center">Loading verification...</Title>
          </div>
        </div>
      )}
      <div
        id={CONTAINER_ID}
        style={{
          flex: 1,
          display: phase === 'active' ? 'flex' : 'none',
          flexDirection: 'column',
          minHeight: '100vh',
        }}
      />
    </div>
  );
};
