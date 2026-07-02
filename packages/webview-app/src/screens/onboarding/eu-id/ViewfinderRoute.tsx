// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import type React from 'react';
import { useCallback, useEffect, useMemo, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

import { EuIdViewfinderScreen } from '@selfxyz/euclid';
import { bridgeCameraAdapter } from '@selfxyz/webview-bridge/adapters';

import { useBridge } from '../../../providers/BridgeProvider';
import { useSelfClient } from '../../../providers/SelfClientProvider';
import type { NavState } from '../../../types/navState';
import { WEB_SAFE_AREA } from '../../../utils/insets';
import { MrzScanStatusOverlay } from '../components/MrzScanStatusOverlay';

// Stable identity for the no-router-state case, so `state` in the scan effect's dep
// array doesn't churn on every render and needlessly re-run the effect.
const EMPTY_STATE: Partial<NavState> = Object.freeze({});

export const EuIdViewfinderRoute: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const bridge = useBridge();
  const { analytics, haptic } = useSelfClient();
  const state = useMemo(() => (location.state as Partial<NavState> | null) ?? EMPTY_STATE, [location.state]);
  const cameraAdapter = useMemo(() => bridgeCameraAdapter(bridge), [bridge]);
  const startedRef = useRef(false);
  const cancelledRef = useRef(false);
  const stopTimerRef = useRef<number | null>(null);

  useEffect(() => {
    // StrictMode (dev) runs setup→cleanup→setup. The start-once guard means only the
    // first setup starts the native scan; without resetting here, the interleaved
    // cleanup would flip cancel on that one in-flight scan and no later setup replaces
    // it, so the resolved MRZ is dropped and we never navigate. Reset each setup so only
    // a real unmount keeps cancel set.
    cancelledRef.current = false;
    if (stopTimerRef.current !== null) {
      window.clearTimeout(stopTimerRef.current);
      stopTimerRef.current = null;
    }
    // The web abandoning the scan (unmount, timeout → error route) must also stop the
    // native camera — otherwise CameraX keeps streaming with no UI attached. Deferred
    // a tick so a StrictMode/dep-churn re-setup can cancel it and keep the live scan.
    const scheduleStop = () => {
      cancelledRef.current = true;
      stopTimerRef.current = window.setTimeout(() => {
        bridge.fire('camera', 'stopCamera', {});
      }, 0);
    };
    if (startedRef.current) {
      return scheduleStop;
    }
    startedRef.current = true;

    void (async () => {
      analytics.trackEvent('eu_id_mrz_scan_started');
      try {
        const mrz = await cameraAdapter.scanMRZ({ documentType: 'id_card' });
        if (cancelledRef.current) return;
        if (!mrz?.documentNumber || !mrz?.dateOfBirth || !mrz?.dateOfExpiry) {
          throw new Error('Incomplete MRZ result');
        }
        analytics.trackEvent('eu_id_mrz_scan_succeeded');
        haptic.trigger('success');
        navigate('/capture/eu-id/nfc-instructions', {
          state: {
            ...state,
            mrz: {
              passportNumber: mrz.documentNumber,
              dateOfBirth: mrz.dateOfBirth,
              dateOfExpiry: mrz.dateOfExpiry,
            },
          },
          replace: true,
        });
      } catch (err) {
        if (cancelledRef.current) return;
        const message = err instanceof Error ? err.message : 'MRZ scan failed';
        analytics.trackEvent('eu_id_mrz_scan_failed', { error: message });
        haptic.trigger('warning');
        navigate('/capture/eu-id/nfc-error', {
          state: { ...state, errorMessage: message, stage: 'mrz' },
          replace: true,
        });
      }
    })();

    return scheduleStop;
  }, [analytics, bridge, cameraAdapter, haptic, navigate, state]);

  const handleBack = useCallback(() => {
    haptic.trigger('selection');
    navigate('/capture/eu-id/back-instructions', { state, replace: true });
  }, [haptic, navigate, state]);

  const onCaptureTips = useCallback(() => {
    haptic.trigger('selection');
    analytics.trackEvent('eu_id_viewfinder_capture_tips');
  }, [analytics, haptic]);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <EuIdViewfinderScreen insets={WEB_SAFE_AREA.insets} onClose={handleBack} onCaptureTips={onCaptureTips} />
      <MrzScanStatusOverlay bridge={bridge} variant="document" />
    </div>
  );
};
