// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import type React from 'react';
import { useCallback } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';

import { LaunchTour1Screen, LaunchTour2Screen, LaunchTour3Screen, LaunchTour4Screen } from '@selfxyz/euclid';

import { WEB_SAFE_AREA } from '../../utils/insets';

export const TourScreen: React.FC = () => {
  const navigate = useNavigate();
  const { step } = useParams<{ step: string }>();
  const stepNum = parseInt(step ?? '1', 10);

  const onNext = useCallback(() => {
    navigate(stepNum < 4 ? `/tunnel/tour/${stepNum + 1}` : '/tunnel/kyc');
  }, [navigate, stepNum]);

  switch (step) {
    case '1':
      return <LaunchTour1Screen {...WEB_SAFE_AREA} onNext={onNext} />;
    case '2':
      return <LaunchTour2Screen {...WEB_SAFE_AREA} onNext={onNext} />;
    case '3':
      return <LaunchTour3Screen {...WEB_SAFE_AREA} onNext={onNext} />;
    case '4':
      return <LaunchTour4Screen {...WEB_SAFE_AREA} onNext={onNext} />;
    default:
      return <Navigate to="/tunnel/tour/1" replace />;
  }
};
