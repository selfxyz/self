// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import type React from 'react';
import { useCallback } from 'react';
import { Navigate, useLocation, useNavigate, useParams } from 'react-router-dom';

import { LaunchTour1Screen, LaunchTour2Screen, LaunchTour3Screen, LaunchTour4Screen } from '@selfxyz/euclid';
import { loadSelectedDocument } from '@selfxyz/mobile-sdk-alpha/browser';

import { useSelfClient } from '../../providers/SelfClientProvider';
import { WEB_SAFE_AREA } from '../../utils/insets';

export const TourScreen: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { step } = useParams<{ step: string }>();
  const stepNum = parseInt(step ?? '1', 10);
  const { client } = useSelfClient();
  const mockParam = import.meta.env.DEV ? location.search : '';

  const onNext = useCallback(async () => {
    if (stepNum < 4) {
      navigate(`/tunnel/tour/${stepNum + 1}${mockParam}`);
      return;
    }

    try {
      const selectedDoc = await loadSelectedDocument(client);
      if (selectedDoc?.metadata?.isRegistered === true) {
        navigate('/tunnel/proof/disclose');
        return;
      }
    } catch {
      // Fall through to KYC when document state is unavailable.
    }

    navigate(`/tunnel/kyc${mockParam}`);
  }, [navigate, stepNum, client, mockParam]);

  const onRestore = useCallback(() => {
    navigate('/recovery', { state: { backPath: `/tunnel/tour/${step ?? '1'}` } });
  }, [navigate, step]);

  switch (step) {
    case '1':
      return <LaunchTour1Screen {...WEB_SAFE_AREA} onNext={onNext} onRestore={onRestore} />;
    case '2':
      return <LaunchTour2Screen {...WEB_SAFE_AREA} onNext={onNext} onRestore={onRestore} />;
    case '3':
      return <LaunchTour3Screen {...WEB_SAFE_AREA} onNext={onNext} onRestore={onRestore} />;
    case '4':
      return <LaunchTour4Screen {...WEB_SAFE_AREA} onNext={onNext} onRestore={onRestore} />;
    default:
      return <Navigate to="/tunnel/tour/1" replace />;
  }
};
