// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AccessibilityInfo, PermissionsAndroid, Platform } from 'react-native';

import type { MRZInfo } from '@selfxyz/mobile-sdk-alpha';
import { useReadMRZ } from '@selfxyz/mobile-sdk-alpha/onboarding/read-mrz';

import type { NormalizedMRZResult } from '../utils/camera';
import { normalizeMRZPayload } from '../utils/camera';

type PermissionState = 'loading' | 'granted' | 'denied';
type ScanState = 'idle' | 'scanning' | 'success' | 'error';

function announceForAccessibility(message: string) {
  if (!message) {
    return;
  }

  try {
    AccessibilityInfo.announceForAccessibility?.(message);
  } catch {
    // Intentionally swallow to avoid crashing accessibility users on announce failures.
  }
}

export interface DocumentScannerCopy {
  instructions: string;
  success: string;
  error: string;
  permissionDenied: string;
  resetAnnouncement: string;
}

export interface DocumentScannerState {
  permissionStatus: PermissionState;
  scanState: ScanState;
  mrzResult: NormalizedMRZResult | null;
  error: string | null;
  requestPermission: () => Promise<void>;
  handleMRZDetected: (payload: MRZInfo) => void;
  handleScannerError: (error: string) => void;
  handleScanAgain: () => void;
}

export function useMRZScanner(copy: DocumentScannerCopy): DocumentScannerState {
  const [permissionStatus, setPermissionStatus] = useState<PermissionState>('loading');
  const [scanState, setScanState] = useState<ScanState>('idle');
  const [mrzResult, setMrzResult] = useState<NormalizedMRZResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const scanStartTimeRef = useRef<number>(Date.now());
  const { onPassportRead } = useReadMRZ(scanStartTimeRef);

  const requestPermission = useCallback(async () => {
    setPermissionStatus('loading');
    setError(null);

    if (Platform.OS === 'android') {
      try {
        const result = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.CAMERA, {
          title: 'Camera permission',
          message: 'We need your permission to access the camera for MRZ scanning.',
          buttonPositive: 'Allow',
          buttonNegative: 'Cancel',
          buttonNeutral: 'Ask me later',
        });

        if (result === PermissionsAndroid.RESULTS.GRANTED) {
          setPermissionStatus('granted');
        } else {
          setPermissionStatus('denied');
        }
      } catch {
        setPermissionStatus('denied');
        setError('Camera permission request failed. Please try again.');
      }
    } else {
      setPermissionStatus('granted');
    }
  }, []);

  useEffect(() => {
    requestPermission();
  }, [requestPermission]);

  useEffect(() => {
    if (permissionStatus === 'granted') {
      announceForAccessibility(copy.instructions);
      setScanState(current => {
        if (current === 'success') {
          return current;
        }
        scanStartTimeRef.current = Date.now();
        return 'scanning';
      });
    } else if (permissionStatus === 'denied') {
      announceForAccessibility(copy.permissionDenied);
      setScanState('idle');
    }
  }, [copy.instructions, copy.permissionDenied, permissionStatus]);

  useEffect(() => {
    if (scanState === 'success') {
      announceForAccessibility(copy.success);
    } else if (scanState === 'error') {
      announceForAccessibility(copy.error);
    }
  }, [copy.error, copy.success, scanState]);

  useEffect(() => {
    if (error) {
      announceForAccessibility(error);
    }
  }, [error]);

  const handleMRZDetected = useCallback(
    (payload: MRZInfo) => {
      setError(null);

      setScanState(current => {
        if (current === 'success') {
          return current;
        }
        return 'scanning';
      });

      try {
        const normalized = normalizeMRZPayload(payload);
        setMrzResult(normalized);
        setScanState('success');
        onPassportRead(null, normalized.info);
      } catch {
        setScanState('error');
        setError('Unable to validate the MRZ data from the scan.');
      }
    },
    [onPassportRead],
  );

  const handleScannerError = useCallback((scannerError: string) => {
    setScanState('error');
    setError(scannerError || 'An unexpected camera error occurred.');
  }, []);

  const handleScanAgain = useCallback(() => {
    if (permissionStatus === 'denied') {
      requestPermission();
      return;
    }

    scanStartTimeRef.current = Date.now();
    setMrzResult(null);
    setError(null);
    setScanState('scanning');
    announceForAccessibility(copy.resetAnnouncement);
  }, [copy.resetAnnouncement, permissionStatus, requestPermission]);

  return useMemo(
    () => ({
      permissionStatus,
      scanState,
      mrzResult,
      error,
      requestPermission,
      handleMRZDetected,
      handleScannerError,
      handleScanAgain,
    }),
    [
      error,
      handleMRZDetected,
      handleScanAgain,
      handleScannerError,
      mrzResult,
      permissionStatus,
      requestPermission,
      scanState,
    ],
  );
}
