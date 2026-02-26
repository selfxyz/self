// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import React, { useCallback, useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Button,
  Title,
  Description,
  BodyText,
  Caption,
  XIcon,
  colors,
  spacing,
} from '@selfxyz/euclid-web';

import { useBridge } from '../../providers/BridgeProvider';
import { useSelfClient } from '../../providers/SelfClientProvider';

export const DocumentCameraScreen: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const bridge = useBridge();
  const { analytics, haptic } = useSelfClient();

  const { countryCode = '', documentType = 'p' } =
    (location.state as {
      countryCode?: string;
      documentType?: string;
    }) || {};

  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const scanPrompt =
    documentType === 'i' ? 'Scan your ID card' : 'Scan your passport';

  const startMRZScan = useCallback(async () => {
    setScanning(true);
    setError(null);
    analytics.trackEvent('camera_mrz_scan_started', {
      documentType,
      countryCode,
    });

    try {
      const result = await bridge.request<{
        documentNumber: string;
        dateOfBirth: string;
        dateOfExpiry: string;
      }>('camera', 'scanMRZ', { documentType, countryCode });

      haptic.trigger('success');
      analytics.trackEvent('camera_mrz_scan_success');

      navigate('/onboarding/nfc', {
        state: {
          countryCode,
          documentType,
          passportNumber: result.documentNumber,
          dateOfBirth: result.dateOfBirth,
          dateOfExpiry: result.dateOfExpiry,
        },
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'MRZ scan failed';
      setError(message);
      analytics.trackEvent('camera_mrz_scan_failed', { error: message });
    } finally {
      setScanning(false);
    }
  }, [bridge, navigate, analytics, haptic, documentType, countryCode]);

  useEffect(() => {
    startMRZScan();
  }, [startMRZScan]);

  const onCancel = useCallback(() => {
    analytics.trackEvent('camera_screen_closed');
    navigate('/');
  }, [navigate, analytics]);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        flex: 1,
        height: '100vh',
        backgroundColor: colors.white,
      }}
    >
      {/* Camera / scan area */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: colors.black,
          position: 'relative',
        }}
      >
        {/* Close button */}
        <button
          onClick={onCancel}
          style={{
            position: 'absolute',
            top: spacing.md,
            right: spacing.md,
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: spacing.sm,
          }}
        >
          <XIcon size={24} color={colors.white} />
        </button>

        {scanning ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: spacing.md }}>
            <div
              style={{
                width: 32,
                height: 32,
                border: `3px solid ${colors.slate400}`,
                borderTopColor: colors.white,
                borderRadius: '50%',
                animation: 'spin 0.8s linear infinite',
              }}
            />
            <BodyText color={colors.white}>Scanning MRZ...</BodyText>
          </div>
        ) : error ? (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: spacing.md,
              padding: `0 ${spacing.lg}px`,
            }}
          >
            <BodyText color={colors.red500} textAlign="center" fontSize={18}>
              Scan failed
            </BodyText>
            <BodyText color={colors.slate400} textAlign="center">
              {error}
            </BodyText>
            <Button
              variant="primary-no-icon"
              text="Try Again"
              onPress={startMRZScan}
            />
          </div>
        ) : null}
      </div>

      {/* Bottom section */}
      <div
        style={{
          padding: spacing.lg,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: spacing.md,
        }}
      >
        <Title textAlign="center">{scanPrompt}</Title>

        <div style={{ display: 'flex', gap: spacing.md, alignItems: 'flex-start' }}>
          <div style={{ paddingTop: 4 }}>
            <span style={{ fontSize: 32 }}>📷</span>
          </div>
          <div style={{ flex: 1 }}>
            <BodyText color={colors.slate800}>
              Open to the photograph page
            </BodyText>
            <Description>
              Hold the camera steady over the text at the bottom of the page
              (MRZ lines).
            </Description>
          </div>
        </div>

        <Caption textAlign="center" style={{ textTransform: 'uppercase', letterSpacing: 0.44 }}>
          Self will not capture an image of your ID.
        </Caption>

        <div style={{ width: '100%' }}>
          <Button
            variant="secondary-label"
            text="Cancel"
            onPress={onCancel}
            fullWidth
          />
        </div>
      </div>
    </div>
  );
};
