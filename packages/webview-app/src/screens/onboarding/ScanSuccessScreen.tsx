// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import type React from 'react';
import { useCallback, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

import { ScanSuccessScreen as EuclidScanSuccessScreen } from '@selfxyz/euclid';

import { MockRegistrationFailureButton } from '../../components/MockRegistrationFailureButton';
import { useSelfClient } from '../../providers/SelfClientProvider';
import { WEB_SAFE_AREA } from '../../utils/insets';
import { mockDocumentStore } from '../../utils/mockDocumentStore';

export const ScanSuccessScreen: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { analytics, haptic } = useSelfClient();
  const { countryCode, documentType } =
    (location.state as { countryCode?: string; documentType?: string } | null) ?? {};

  const persisted = useRef(false);
  useEffect(() => {
    if (!persisted.current && countryCode && documentType) {
      mockDocumentStore.addDocument(countryCode, documentType);
      persisted.current = true;
    }
  }, [countryCode, documentType]);

  const goHome = useCallback(() => {
    haptic.trigger('selection');
    analytics.trackEvent('registration_success_finished');
    navigate('/', { state: { skipOnboardingRedirect: true } });
  }, [analytics, haptic, navigate]);

  return (
    <>
      <MockRegistrationFailureButton />
      <EuclidScanSuccessScreen
        {...WEB_SAFE_AREA}
        navLabel="Registration"
        totalSteps={4}
        currentStep={4}
        title="Your ID is now registered"
        onClose={goHome}
        onFinish={goHome}
      />
    </>
  );
};
