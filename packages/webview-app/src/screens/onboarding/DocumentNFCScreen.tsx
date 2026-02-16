// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Button, Spinner, Text, View, YStack } from 'tamagui';
import { v4 as uuidv4 } from 'uuid';

import { onNfcProgress } from '@selfxyz/webview-bridge/adapters';

import { useBridge } from '../../providers/BridgeProvider';
import { useSelfClient } from '../../providers/SelfClientProvider';

type ScanState = 'idle' | 'scanning' | 'success' | 'error';

export const DocumentNFCScreen: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const bridge = useBridge();
  const { scanner, analytics, haptic, documents } = useSelfClient();

  const { countryCode = '', documentType = 'p', passportNumber = '', dateOfBirth = '', dateOfExpiry = '' } =
    (location.state as {
      countryCode?: string;
      documentType?: string;
      passportNumber?: string;
      dateOfBirth?: string;
      dateOfExpiry?: string;
    }) || {};

  const [scanState, setScanState] = useState<ScanState>('idle');
  const [progressMessage, setProgressMessage] = useState<string | null>(null);
  const [progressPercent, setProgressPercent] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const sessionIdRef = useRef(uuidv4());

  // Subscribe to NFC progress events
  useEffect(() => {
    const unsub = onNfcProgress(bridge, (progress) => {
      setProgressMessage(progress.message ?? progress.step);
      setProgressPercent(progress.percent);
    });
    return unsub;
  }, [bridge]);

  const startScan = useCallback(async () => {
    setScanState('scanning');
    setErrorMessage(null);
    setProgressMessage(null);
    setProgressPercent(0);

    abortRef.current = new AbortController();
    const scanStartTime = Date.now();

    analytics.trackEvent('nfc_scan_started', {
      sessionId: sessionIdRef.current,
      documentType,
      countryCode,
    });

    try {
      const result = await scanner.scan({
        passportNumber,
        dateOfBirth,
        dateOfExpiry,
        sessionId: sessionIdRef.current,
        signal: abortRef.current.signal,
      });

      const durationSeconds = (Date.now() - scanStartTime) / 1000;
      analytics.trackEvent('nfc_scan_success', {
        duration_seconds: durationSeconds,
      });

      haptic.trigger('success');
      setScanState('success');

      // Store the scanned passport data
      if (result && typeof result === 'object') {
        const passportData = (result as { passportData?: unknown }).passportData;
        if (passportData && typeof passportData === 'object') {
          const docId = (passportData as { contentHash?: string }).contentHash ?? sessionIdRef.current;
          await documents.saveDocument(docId, passportData as Record<string, unknown>);
        }
      }

      // Brief delay for UX, then navigate to confirm
      setTimeout(() => {
        navigate('/onboarding/confirm');
      }, 700);
    } catch (err) {
      if (abortRef.current?.signal.aborted) return;

      const message = err instanceof Error ? err.message : 'NFC scan failed';
      const durationSeconds = (Date.now() - scanStartTime) / 1000;

      analytics.trackEvent('nfc_scan_failed', {
        error: message,
        duration_seconds: durationSeconds,
      });

      setErrorMessage(message);
      setScanState('error');
    }
  }, [scanner, analytics, haptic, documents, navigate, passportNumber, dateOfBirth, dateOfExpiry, documentType, countryCode]);

  const cancelScan = useCallback(() => {
    abortRef.current?.abort();
    analytics.trackEvent('nfc_scan_cancelled');
    navigate('/');
  }, [navigate, analytics]);

  return (
    <YStack flex={1} backgroundColor="#000000">
      {/* Top: animation area */}
      <View
        flex={1}
        backgroundColor="#F8FAFC"
        borderBottomLeftRadius={24}
        borderBottomRightRadius={24}
        alignItems="center"
        justifyContent="center"
      >
        {scanState === 'scanning' ? (
          <YStack alignItems="center" gap={16}>
            <Spinner size="large" color="#000000" />
            <Text fontFamily="DINOT-Medium" fontSize={16} color="#000000">
              {progressMessage ?? 'Hold your device against the ID chip...'}
            </Text>
            {progressPercent > 0 && (
              <View
                width={200}
                height={4}
                backgroundColor="#E2E8F0"
                borderRadius={2}
                overflow="hidden"
              >
                <View
                  width={`${progressPercent}%`}
                  height="100%"
                  backgroundColor="#2563EB"
                  borderRadius={2}
                />
              </View>
            )}
          </YStack>
        ) : scanState === 'success' ? (
          <YStack alignItems="center" gap={12}>
            <Text fontSize={64}>✅</Text>
            <Text fontFamily="DINOT-Medium" fontSize={18} color="#000000">
              Scan complete
            </Text>
          </YStack>
        ) : scanState === 'error' ? (
          <YStack alignItems="center" gap={12} paddingHorizontal={24}>
            <Text fontSize={48}>⚠️</Text>
            <Text fontFamily="DINOT-Medium" fontSize={16} color="#EF4444" textAlign="center">
              {errorMessage}
            </Text>
          </YStack>
        ) : (
          <YStack alignItems="center" gap={12}>
            <Text fontSize={64}>📱</Text>
            <Text fontFamily="DINOT-Medium" fontSize={16} color="#64748B">
              Ready to scan NFC chip
            </Text>
          </YStack>
        )}
      </View>

      {/* Bottom: instructions + buttons */}
      <YStack
        paddingHorizontal={24}
        paddingVertical={24}
        gap={16}
        backgroundColor="#ffffff"
      >
        {scanState === 'scanning' ? (
          <>
            <Text fontFamily="Advercase-Regular" fontSize={24} color="#000000" textAlign="center">
              Ready to scan
            </Text>
            <Text fontFamily="DINOT-Medium" fontSize={14} color="#64748B" textAlign="center">
              Hold your device near the NFC tag and stop moving when it vibrates.
            </Text>
          </>
        ) : scanState === 'error' ? (
          <>
            <Text fontFamily="Advercase-Regular" fontSize={24} color="#000000" textAlign="center">
              Scan failed
            </Text>
            <Text fontFamily="DINOT-Medium" fontSize={14} color="#64748B" textAlign="center">
              Please try again. Make sure your document&apos;s chip is near your phone.
            </Text>
            <Button
              backgroundColor="#000000"
              color="#ffffff"
              fontFamily="DINOT-Medium"
              borderRadius={12}
              height={52}
              onPress={startScan}
              pressStyle={{ opacity: 0.7 }}
            >
              Try Again
            </Button>
          </>
        ) : (
          <>
            <Text fontFamily="Advercase-Regular" fontSize={24} color="#000000" textAlign="center">
              Verify your ID
            </Text>
            <Text fontFamily="DINOT-Medium" fontSize={16} color="#1E293B" textAlign="center">
              Find the RFID chip in your ID
            </Text>
            <Text fontFamily="DINOT-Medium" fontSize={14} color="#64748B" textAlign="center">
              Place your phone against the chip and keep it still until the sensor reads it.
            </Text>
            <Text
              fontFamily="DINOT-Medium"
              fontSize={11}
              color="#94A3B8"
              textAlign="center"
              textTransform="uppercase"
              letterSpacing={0.44}
            >
              Self does not store this information.
            </Text>
            <Button
              backgroundColor="#000000"
              color="#ffffff"
              fontFamily="DINOT-Medium"
              borderRadius={12}
              height={52}
              onPress={startScan}
              pressStyle={{ opacity: 0.7 }}
            >
              Start Scan
            </Button>
          </>
        )}

        <Button
          backgroundColor="transparent"
          borderWidth={1}
          borderColor="#CBD5E1"
          borderRadius={12}
          height={52}
          fontFamily="DINOT-Medium"
          color="#000000"
          onPress={cancelScan}
          pressStyle={{ opacity: 0.7 }}
        >
          Cancel
        </Button>
      </YStack>
    </YStack>
  );
};
