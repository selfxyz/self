// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import React, { useCallback, useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Button, Spinner, Text, View, XStack, YStack } from 'tamagui';

import { useBridge } from '../../providers/BridgeProvider';
import { useSelfClient } from '../../providers/SelfClientProvider';

export const DocumentCameraScreen: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const bridge = useBridge();
  const { analytics, haptic } = useSelfClient();

  const { countryCode = '', documentType = 'p' } = (location.state as {
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
    analytics.trackEvent('camera_mrz_scan_started', { documentType, countryCode });

    try {
      const result = await bridge.request<{
        passportNumber: string;
        dateOfBirth: string;
        dateOfExpiry: string;
      }>('camera', 'scanMRZ', { documentType, countryCode });

      haptic.trigger('success');
      analytics.trackEvent('camera_mrz_scan_success');

      // Navigate to NFC scan with MRZ data
      navigate('/onboarding/nfc', {
        state: {
          countryCode,
          documentType,
          passportNumber: result.passportNumber,
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

  // Auto-start scan on mount
  useEffect(() => {
    startMRZScan();
  }, [startMRZScan]);

  const onCancel = useCallback(() => {
    analytics.trackEvent('camera_screen_closed');
    navigate('/');
  }, [navigate, analytics]);

  return (
    <YStack flex={1} backgroundColor="#ffffff">
      {/* Camera / scan area (top section) */}
      <View flex={1} backgroundColor="#000000" alignItems="center" justifyContent="center">
        {scanning ? (
          <YStack alignItems="center" gap={16}>
            <Spinner size="large" color="#ffffff" />
            <Text fontFamily="DINOT-Medium" fontSize={16} color="#ffffff">
              Scanning MRZ...
            </Text>
          </YStack>
        ) : error ? (
          <YStack alignItems="center" gap={16} paddingHorizontal={24}>
            <Text fontFamily="DINOT-Medium" fontSize={18} color="#EF4444" textAlign="center">
              Scan failed
            </Text>
            <Text fontFamily="DINOT-Medium" fontSize={14} color="#94A3B8" textAlign="center">
              {error}
            </Text>
            <Button
              backgroundColor="#2563EB"
              color="#ffffff"
              fontFamily="DINOT-Medium"
              borderRadius={12}
              onPress={startMRZScan}
              pressStyle={{ opacity: 0.7 }}
            >
              Try Again
            </Button>
          </YStack>
        ) : null}
      </View>

      {/* Bottom section */}
      <YStack
        paddingHorizontal={24}
        paddingVertical={24}
        gap={16}
        alignItems="center"
        backgroundColor="#ffffff"
      >
        <Text fontFamily="Advercase-Regular" fontSize={24} color="#000000" textAlign="center">
          {scanPrompt}
        </Text>

        <XStack gap={16} alignItems="flex-start">
          <View paddingTop={4}>
            <Text fontSize={32}>📷</Text>
          </View>
          <YStack flex={1}>
            <Text fontFamily="DINOT-Medium" fontSize={16} color="#1E293B">
              Open to the photograph page
            </Text>
            <Text fontFamily="DINOT-Medium" fontSize={14} color="#64748B" marginTop={4}>
              Hold the camera steady over the text at the bottom of the page (MRZ lines).
            </Text>
          </YStack>
        </XStack>

        <Text
          fontFamily="DINOT-Medium"
          fontSize={11}
          color="#94A3B8"
          textAlign="center"
          textTransform="uppercase"
          letterSpacing={0.44}
        >
          Self will not capture an image of your ID.
        </Text>

        <Button
          backgroundColor="transparent"
          borderWidth={1}
          borderColor="#CBD5E1"
          borderRadius={12}
          width="100%"
          fontFamily="DINOT-Medium"
          color="#000000"
          onPress={onCancel}
          pressStyle={{ opacity: 0.7 }}
        >
          Cancel
        </Button>
      </YStack>
    </YStack>
  );
};
