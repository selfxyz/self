// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import type React from 'react';
import { useCallback, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

import { AadhaarAppInstructionsScreen } from '@selfxyz/euclid';

import { useBridge } from '../../../providers/BridgeProvider';
import { useSelfClient } from '../../../providers/SelfClientProvider';
import { WEB_SAFE_AREA } from '../../../utils/insets';

const M_AADHAAR_PLAY_STORE_URL =
  'https://play.google.com/store/apps/details?id=in.gov.uidai.mAadhaarPlus';

export const AadhaarAppInstructionsRoute: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const bridge = useBridge();
  const { analytics, haptic } = useSelfClient();
  const state = (location.state as { countryCode?: string } | null) ?? {};
  const [isUploadProcessing, setIsUploadProcessing] = useState(false);

  const onClose = useCallback(() => {
    haptic.trigger('selection');
    navigate(-1);
  }, [haptic, navigate]);

  const onInstall = useCallback(() => {
    haptic.trigger('selection');
    analytics.trackEvent('aadhaar_install_mapp');
    window.open(M_AADHAAR_PLAY_STORE_URL, '_blank');
  }, [analytics, haptic]);

  const onUpload = useCallback(() => {
    haptic.trigger('selection');
    analytics.trackEvent('aadhaar_upload_started');
    setIsUploadProcessing(true);

    void (async () => {
      try {
        // TODO(WIA-aadhaar): wire a real bridge method once the native
        // Aadhaar handler ships. SPEC.md fixes the bridge to its 10 existing
        // domains, so a future Aadhaar flow will route via camera or documents
        // with a dedicated method. Today this rejects with METHOD_NOT_FOUND,
        // which surfaces as AadhaarUploadErrorScreen — the intended failure
        // mode until the native handler exists.
        await bridge.request('camera', 'aadhaarUploadFromLibrary', {});
        analytics.trackEvent('aadhaar_upload_succeeded');
        haptic.trigger('success');
        navigate('/onboarding/aadhaar/upload-success', { state, replace: true });
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Aadhaar upload failed';
        analytics.trackEvent('aadhaar_upload_failed', { error: message });
        haptic.trigger('warning');
        navigate('/onboarding/aadhaar/upload-error', {
          state: { ...state, errorMessage: message },
          replace: true,
        });
      } finally {
        setIsUploadProcessing(false);
      }
    })();
  }, [analytics, bridge, haptic, navigate, state]);

  return (
    <AadhaarAppInstructionsScreen
      insets={WEB_SAFE_AREA.insets}
      onClose={onClose}
      onInstall={onInstall}
      onUpload={onUpload}
      isUploadProcessing={isUploadProcessing}
    />
  );
};
