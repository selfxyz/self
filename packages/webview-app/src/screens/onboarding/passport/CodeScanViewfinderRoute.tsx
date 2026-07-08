// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import type React from 'react';
import { useCallback, useEffect, useMemo, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

import { PassportCodeScanViewfinderScreen } from '@selfxyz/euclid';
import { bridgeCameraAdapter } from '@selfxyz/webview-bridge/adapters';

import { useBridge } from '../../../providers/BridgeProvider';
import { useSelfClient } from '../../../providers/SelfClientProvider';
import { WEB_SAFE_AREA } from '../../../utils/insets';

// Module-level so React StrictMode's double-effect in dev shares one native
// scan instead of the first (immediately-cancelled) effect owning the only
// pending promise and dropping its result.
let activeMrzScan: Promise<Awaited<ReturnType<ReturnType<typeof bridgeCameraAdapter>['scanMRZ']>>> | null = null;

export const PassportCodeScanViewfinderRoute: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const bridge = useBridge();
  const { analytics, haptic } = useSelfClient();
  const state = (location.state as { countryCode?: string } | null) ?? {};
  const cameraAdapter = useMemo(() => bridgeCameraAdapter(bridge), [bridge]);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      if (!activeMrzScan) {
        analytics.trackEvent('passport_mrz_scan_started');
        // Report the scan-frame rect (physical px, viewport-relative) so a
        // native host can pin its camera preview exactly over it.
        const frame = containerRef.current?.querySelector('video')?.parentElement;
        const rect = frame?.getBoundingClientRect();
        const dpr = window.devicePixelRatio || 1;
        const scanRect =
          rect && rect.width > 0
            ? { x: rect.x * dpr, y: rect.y * dpr, width: rect.width * dpr, height: rect.height * dpr }
            : undefined;
        activeMrzScan = cameraAdapter.scanMRZ(scanRect ? { scanRect } : {});
      }
      try {
        const mrz = await activeMrzScan;
        activeMrzScan = null;
        if (cancelled) return;
        if (!mrz?.documentNumber || !mrz?.dateOfBirth || !mrz?.dateOfExpiry) {
          throw new Error('Incomplete MRZ result');
        }
        analytics.trackEvent('passport_mrz_scan_succeeded');
        haptic.trigger('success');
        navigate('/capture/passport/nfc', {
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
        activeMrzScan = null;
        if (cancelled) return;
        const message = err instanceof Error ? err.message : 'MRZ scan failed';
        analytics.trackEvent('passport_mrz_scan_failed', { error: message });
        haptic.trigger('warning');
        navigate('/capture/passport/nfc-error', {
          state: { ...state, errorMessage: message, stage: 'mrz' },
          replace: true,
        });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [analytics, cameraAdapter, haptic, navigate, state]);

  const handleBack = useCallback(() => {
    haptic.trigger('selection');
    navigate('/capture/passport/code-scan-instructions', {
      state,
      replace: true,
    });
  }, [haptic, navigate, state]);

  const onCaptureTips = useCallback(() => {
    haptic.trigger('selection');
    analytics.trackEvent('passport_viewfinder_capture_tips');
  }, [analytics, haptic]);

  return (
    <div ref={containerRef} style={{ display: 'contents' }}>
      <PassportCodeScanViewfinderScreen
        insets={WEB_SAFE_AREA.insets}
        onClose={handleBack}
        onCaptureTips={onCaptureTips}
      />
    </div>
  );
};
