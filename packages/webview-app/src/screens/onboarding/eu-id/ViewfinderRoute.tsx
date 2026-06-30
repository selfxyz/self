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
import { WEB_SAFE_AREA } from '../../../utils/insets';
import { MrzScanStatusOverlay } from '../components/MrzScanStatusOverlay';

export const EuIdViewfinderRoute: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const bridge = useBridge();
  const { analytics, haptic } = useSelfClient();
  const state = (location.state as { countryCode?: string } | null) ?? {};
  const cameraAdapter = useMemo(() => bridgeCameraAdapter(bridge), [bridge]);
  const startedRef = useRef(false);

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;

    let cancelled = false;
    void (async () => {
      analytics.trackEvent('eu_id_mrz_scan_started');
      try {
        const mrz = await cameraAdapter.scanMRZ({ documentType: 'id_card' });
        if (cancelled) return;
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
        if (cancelled) return;
        const message = err instanceof Error ? err.message : 'MRZ scan failed';
        analytics.trackEvent('eu_id_mrz_scan_failed', { error: message });
        haptic.trigger('warning');
        navigate('/capture/eu-id/nfc-error', {
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
