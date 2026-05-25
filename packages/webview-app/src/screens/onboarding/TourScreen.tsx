// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import type React from 'react';
import { useCallback } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';

import { LaunchTour1Screen, LaunchTour2Screen, LaunchTour3Screen, LaunchTour4Screen } from '@selfxyz/euclid';

import { MockRegistrationFailureButton } from '../../components/MockRegistrationFailureButton';
import { WEB_SAFE_AREA } from '../../utils/insets';

export const TourScreen: React.FC = () => {
  const navigate = useNavigate();
  const { step } = useParams<{ step: string }>();
  const stepNumber = Number.parseInt(step ?? '1', 10);

  const onNext = useCallback(() => {
    navigate(stepNumber < 4 ? `/onboarding/tour/${stepNumber + 1}` : '/onboarding/country');
  }, [navigate, stepNumber]);

  const onRestore = useCallback(() => {
    navigate('/', { state: { skipOnboardingRedirect: true } });
  }, [navigate]);

  switch (step) {
    case '1':
      return (
        <>
          <MockRegistrationFailureButton />
          <LaunchTour1Screen {...WEB_SAFE_AREA} onNext={onNext} onRestore={onRestore} />
        </>
      );
    case '2':
      return (
        <>
          <MockRegistrationFailureButton />
          <LaunchTour2Screen {...WEB_SAFE_AREA} onNext={onNext} onRestore={onRestore} />
        </>
      );
    case '3':
      return (
        <>
          <MockRegistrationFailureButton />
          <LaunchTour3Screen {...WEB_SAFE_AREA} onNext={onNext} onRestore={onRestore} />
        </>
      );
    case '4':
      return (
        <div className="tour4-lottie-scale">
          <MockRegistrationFailureButton />
          <LaunchTour4Screen {...WEB_SAFE_AREA} onNext={onNext} onSkip={onRestore} onRestore={onRestore} />
        </div>
      );
    default:
      return <Navigate to="/onboarding/tour/1" replace />;
  }
};
