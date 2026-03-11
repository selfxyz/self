// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import React, { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { BodyText, Button, Description, Title, colors, spacing } from '@selfxyz/euclid-web';

import { useSelfClient } from '../../providers/SelfClientProvider';

export const ProviderLaunchScreen: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { analytics, haptic } = useSelfClient();

  const { countryCode = '', documentType = '' } =
    (location.state as {
      countryCode?: string;
      documentType?: string;
    }) || {};

  useEffect(() => {
    analytics.trackEvent('provider_launch_placeholder_viewed', {
      countryCode,
      documentType,
    });
    // TODO(WV-04): replace this placeholder with the actual provider launch and return handling flow.
  }, [analytics, countryCode, documentType]);

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
        <Title textAlign="center">Launching provider...</Title>
        <Description>
          Self will hand off document capture and verification to a provider-owned
          web flow for this verification session.
        </Description>
        <BodyText color={colors.slate500}>
          Provider integration is still a placeholder in the active WebView app.
        </BodyText>
        <div style={{ width: '100%' }}>
          <Button
            variant="secondary-label"
            text="Back"
            fullWidth
            onPress={() => {
              haptic.trigger('selection');
              navigate(-1);
            }}
          />
        </div>
      </div>
    </div>
  );
};
