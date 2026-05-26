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

export const PassportCodeScanViewfinderRoute: React.FC = () => {
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
      analytics.trackEvent('passport_mrz_scan_started');
      try {
        const mrz = await cameraAdapter.scanMRZ({});
        if (cancelled) return;
        if (!mrz?.documentNumber || !mrz?.dateOfBirth || !mrz?.dateOfExpiry) {
          throw new Error('Incomplete MRZ result');
        }
        analytics.trackEvent('passport_mrz_scan_succeeded');
        haptic.trigger('success');
        navigate('/onboarding/passport/nfc', {
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
        const message =
          err instanceof Error ? err.message : 'MRZ scan failed';
        analytics.trackEvent('passport_mrz_scan_failed', { error: message });
        haptic.trigger('warning');
        navigate('/onboarding/passport/nfc-error', {
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
    navigate('/onboarding/passport/code-scan-instructions', {
      state,
      replace: true,
    });
  }, [haptic, navigate, state]);

  const onCaptureTips = useCallback(() => {
    haptic.trigger('selection');
    analytics.trackEvent('passport_viewfinder_capture_tips');
  }, [analytics, haptic]);

  return (
    <PassportCodeScanViewfinderScreen
      insets={WEB_SAFE_AREA.insets}
      onClose={handleBack}
      onCaptureTips={onCaptureTips}
    />
  );
};
