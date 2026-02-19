// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { v4 as uuidv4 } from 'uuid';
import {
  Button,
  Title,
  Description,
  BodyText,
  Caption,
  colors,
  spacing,
} from '@selfxyz/euclid-web';

import { onNfcProgress } from '@selfxyz/webview-bridge/adapters';

import { useBridge } from '../../providers/BridgeProvider';
import { useSelfClient } from '../../providers/SelfClientProvider';

type ScanState = 'idle' | 'scanning' | 'success' | 'error';

export const DocumentNFCScreen: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const bridge = useBridge();
  const { scanner, analytics, haptic, documents } = useSelfClient();

  const {
    countryCode = '',
    documentType = 'p',
    passportNumber = '',
    dateOfBirth = '',
    dateOfExpiry = '',
  } = (location.state as {
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

  useEffect(() => {
    const unsub = onNfcProgress(bridge, progress => {
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

      if (result && typeof result === 'object') {
        const passportData = (result as { passportData?: unknown })
          .passportData;
        if (passportData && typeof passportData === 'object') {
          const docId =
            (passportData as { contentHash?: string }).contentHash ??
            sessionIdRef.current;
          await documents.saveDocument(
            docId,
            passportData as Record<string, unknown>,
          );
        }
      }

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
  }, [
    scanner,
    analytics,
    haptic,
    documents,
    navigate,
    passportNumber,
    dateOfBirth,
    dateOfExpiry,
    documentType,
    countryCode,
  ]);

  const cancelScan = useCallback(() => {
    abortRef.current?.abort();
    analytics.trackEvent('nfc_scan_cancelled');
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
      {/* Top: animation area */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: colors.slate50,
          borderBottomLeftRadius: 24,
          borderBottomRightRadius: 24,
        }}
      >
        {scanState === 'scanning' ? (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: spacing.md,
            }}
          >
            <div
              style={{
                width: 32,
                height: 32,
                border: `3px solid ${colors.slate200}`,
                borderTopColor: colors.black,
                borderRadius: '50%',
                animation: 'spin 0.8s linear infinite',
              }}
            />
            <BodyText color={colors.black}>
              {progressMessage ?? 'Hold your device against the ID chip...'}
            </BodyText>
            {progressPercent > 0 && (
              <div
                style={{
                  width: 200,
                  height: 4,
                  backgroundColor: colors.slate200,
                  borderRadius: 2,
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    width: `${progressPercent}%`,
                    height: '100%',
                    backgroundColor: colors.blue600,
                    borderRadius: 2,
                    transition: 'width 0.3s ease',
                  }}
                />
              </div>
            )}
          </div>
        ) : scanState === 'success' ? (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: spacing.sm,
            }}
          >
            <span style={{ fontSize: 64 }}>✅</span>
            <BodyText color={colors.black} fontSize={18}>
              Scan complete
            </BodyText>
          </div>
        ) : scanState === 'error' ? (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: spacing.sm,
              padding: `0 ${spacing.lg}px`,
            }}
          >
            <span style={{ fontSize: 48 }}>⚠️</span>
            <BodyText color={colors.red500} textAlign="center">
              {errorMessage}
            </BodyText>
          </div>
        ) : (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: spacing.sm,
            }}
          >
            <span style={{ fontSize: 64 }}>📱</span>
            <BodyText color={colors.slate500}>Ready to scan NFC chip</BodyText>
          </div>
        )}
      </div>

      {/* Bottom: instructions + buttons */}
      <div
        style={{
          padding: spacing.lg,
          display: 'flex',
          flexDirection: 'column',
          gap: spacing.md,
          backgroundColor: colors.white,
        }}
      >
        {scanState === 'scanning' ? (
          <>
            <Title textAlign="center">Ready to scan</Title>
            <Description textAlign="center">
              Hold your device near the NFC tag and stop moving when it
              vibrates.
            </Description>
          </>
        ) : scanState === 'error' ? (
          <>
            <Title textAlign="center">Scan failed</Title>
            <Description textAlign="center">
              Please try again. Make sure your document&apos;s chip is near your
              phone.
            </Description>
            <Button
              variant="primary-no-icon"
              text="Try Again"
              onPress={startScan}
              fullWidth
            />
          </>
        ) : (
          <>
            <Title textAlign="center">Verify your ID</Title>
            <BodyText color={colors.slate800} textAlign="center">
              Find the RFID chip in your ID
            </BodyText>
            <Description textAlign="center">
              Place your phone against the chip and keep it still until the
              sensor reads it.
            </Description>
            <Caption
              textAlign="center"
              style={{ textTransform: 'uppercase', letterSpacing: 0.44 }}
            >
              Self does not store this information.
            </Caption>
            <Button
              variant="primary-no-icon"
              text="Start Scan"
              onPress={startScan}
              fullWidth
            />
          </>
        )}

        <Button
          variant="secondary-label"
          text="Cancel"
          onPress={cancelScan}
          fullWidth
        />
      </div>
    </div>
  );
};
