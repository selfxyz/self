// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import { getSKIPEM, initPassportDataParsing } from "@selfxyz/common";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { NativeEventEmitter, NativeModules, Platform } from "react-native";
import { useSelfClient } from "src/context";
import { storePassportData } from "src/documents/utils";
import { scanNFC } from "src/nfc";

const getEmitter = () => {
    return Platform.OS === 'android'
      ? new NativeEventEmitter(NativeModules.nativeModule)
      : null;
};

type useScanNFCProps = {
  onNFCMajorSuccess?: () => void;
  onNFCMinorSuccess?: () => void;
  onNFCError?: (message: string) => void;

  onError?: (message: string) => void;
  onSuccess?: () => void;

  onScanCancelled?: () => void;
  onTimeout?: () => void;

  timeoutMs?: number | null;
  sessionId: string;
};

enum NFCScanStatus {
  IDLE = 'idle',
  STARTING = 'starting',
  SCANNING = 'scanning',
  PROCESSING = 'processing',
  STORING = 'storing',
  SUCCESS = 'success',
}

// TODO: add call to reset() when an error happens (through SelfClient?) otherwise the scanning is still ongoing?
export const useScanNFC = ({
  onNFCMajorSuccess,
  onNFCMinorSuccess,
  onNFCError,
  onError,
  onSuccess,
  onScanCancelled,
  onTimeout,
  sessionId,
  timeoutMs = 30000,
}: useScanNFCProps) => {
  const selfClient = useSelfClient();
  const mrzData = selfClient.useMRZStore(state => state.getMRZ());

  const [status, setStatus] = useState<NFCScanStatus>(NFCScanStatus.IDLE);
  const [detailsMessage, setDetailsMessage] = useState<string | null>(null);
  const emitter = useMemo(getEmitter, []);
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scanCancelledRef = useRef(false);
  const scanTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const clearTimeoutRef = () => {
    if (scanTimeoutRef.current) {
      clearTimeout(scanTimeoutRef.current);
      scanTimeoutRef.current = null;
    }
  };

  useEffect(() => {
    if (emitter !== null) {
      const subscription = emitter.addListener(
        'NativeEvent',
        (event: string) => {
          setDetailsMessage(event);

          // Haptic feedback mapping for completion/error only
          if (
            event === 'PACE succeeded' ||
            event === 'BAC succeeded' ||
            event === 'Chip authentication succeeded'
          ) {
            onNFCMajorSuccess?.(); // Major success
          } else if (
            event === 'Reading DG1 succeeded' ||
            event === 'Reading DG2 succeeded' ||
            event === 'Reading SOD succeeded' ||
            event === 'Reading COM succeeded'
          ) {
            onNFCMinorSuccess?.(); // Minor DG step
          } else if (
            event === 'BAC failed' ||
            event === 'PACE failed' ||
            event.toLowerCase().includes('failed') ||
            event.toLowerCase().includes('error')
          ) {
            clearTimeoutRef();
            setStatus(NFCScanStatus.IDLE);
            setError(event);
            onNFCError?.(event);
          }
        },
      );

      return () => {
        subscription.remove();
      };
    }
  }, [setDetailsMessage, onNFCMajorSuccess, onNFCMinorSuccess, onNFCError, onScanCancelled, emitter]);

  const startScan = useCallback(async () => {
    setIsScanning(true);
    setError(null);
    setStatus(NFCScanStatus.SCANNING);
    scanCancelledRef.current = false;

    const scanStartTime = Date.now();

    // Set timeout for scan
    if (scanTimeoutRef.current) {
      clearTimeout(scanTimeoutRef.current);
    }

    if (timeoutMs) {
      scanTimeoutRef.current = setTimeout(() => {
        scanCancelledRef.current = true;
        setStatus(NFCScanStatus.IDLE);
        setError('Scan timed out');
        setIsScanning(false);
        onTimeout?.();
      }, timeoutMs);
    }

    try {
      const scanResult = await scanNFC(selfClient, {
        passportNumber: mrzData.documentNumber,
        dateOfBirth: mrzData.dateOfBirth,
        dateOfExpiry: mrzData.dateOfExpiry,
        sessionId,
      });

      // Check if scan was cancelled
      if (scanCancelledRef.current) {
        return;
      }

      const scanDurationSeconds = ((Date.now() - scanStartTime) / 1000).toFixed(2);
      console.log('NFC Scan Successful - Duration:', scanDurationSeconds, 'seconds');

      setStatus(NFCScanStatus.PROCESSING);

      // Parse the passport data
      const skiPem = await getSKIPEM('production');
      const parsedPassportData = initPassportDataParsing(scanResult.passportData, skiPem);

      // Check again if scan was cancelled
      if (scanCancelledRef.current) {
        return;
      }

      setStatus(NFCScanStatus.STORING);

      // Store the document
      await storePassportData(selfClient, parsedPassportData);

      // Check again if scan was cancelled
      if (scanCancelledRef.current) {
        return;
      }

      setStatus(NFCScanStatus.SUCCESS);

      // Navigate to success screen with the document data
      onSuccess?.();


    } catch (error) {
      if (scanCancelledRef.current) {
        return;
      }

      console.error('NFC scan failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to scan NFC chip';
      setError(errorMessage);
      setStatus(NFCScanStatus.IDLE);

      onError?.(errorMessage);
    } finally {
      clearTimeoutRef();
      setIsScanning(false);
      setStatus(NFCScanStatus.IDLE);
    }
  }, [timeoutMs, onTimeout, onError, onSuccess, onNFCMajorSuccess, onNFCMinorSuccess, onNFCError, onScanCancelled]);

  const cancelScan = useCallback(() => {
    scanCancelledRef.current = true;
    if (scanTimeoutRef.current) {
      clearTimeout(scanTimeoutRef.current);
      scanTimeoutRef.current = null;
    }

    setIsScanning(false);
    setStatus(NFCScanStatus.IDLE);
    onScanCancelled?.();
  }, [onScanCancelled]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      scanCancelledRef.current = true;
      if (scanTimeoutRef.current) {
        clearTimeout(scanTimeoutRef.current);
        scanTimeoutRef.current = null;
      }
    };
  }, []);

  return {
    status,
    detailsMessage,
    isScanning,
    error,
    startScan,
    cancelScan,
  };
};
