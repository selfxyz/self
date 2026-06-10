// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import type React from 'react';
import { useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

import { AadhaarUploadErrorScreen } from '@selfxyz/euclid';

import { SupportReference } from '../../../components/SupportReference';
import { useSelfClient } from '../../../providers/SelfClientProvider';
import { WEB_SAFE_AREA } from '../../../utils/insets';

export const AadhaarUploadErrorRoute: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { analytics, haptic } = useSelfClient();
  const state = (location.state as { countryCode?: string; errorMessage?: string } | null) ?? {};

  const handleClose = useCallback(() => {
    haptic.trigger('selection');
    navigate('/', { replace: true });
  }, [haptic, navigate]);

  const onTryDifferentMethod = useCallback(() => {
    haptic.trigger('selection');
    analytics.trackEvent('aadhaar_try_different_method');
    navigate('/pick-country', { replace: true });
  }, [analytics, haptic, navigate]);

  const onUploadFromLibrary = useCallback(() => {
    haptic.trigger('selection');
    analytics.trackEvent('aadhaar_upload_retry');
    navigate('/capture/aadhaar/instructions', { state, replace: true });
  }, [analytics, haptic, navigate, state]);

  return (
    <>
      <AadhaarUploadErrorScreen
        insets={WEB_SAFE_AREA.insets}
        onClose={handleClose}
        onTryDifferentMethod={onTryDifferentMethod}
        onUploadFromLibrary={onUploadFromLibrary}
      />
      <SupportReference />
    </>
  );
};
