// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import type React from 'react';
import { useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

import { ComingSoonScreen as EuclidComingSoonScreen } from '@selfxyz/euclid';

import { useSelfClient } from '../providers/SelfClientProvider';
import { getCountryName, renderFlag } from '../utils/countryFlags';

export const ComingSoonScreen: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { analytics, haptic } = useSelfClient();

  const { countryCode = '', documentType } =
    (location.state as {
      countryCode?: string;
      documentType?: string;
    }) || {};

  const documentTypeText = documentType === 'i' ? 'ID Cards' : documentType === 'p' ? 'Passports' : '';

  const onDismiss = useCallback(() => {
    haptic.trigger('selection');
    analytics.trackEvent('coming_soon_dismissed');
    navigate('/');
  }, [navigate, haptic, analytics]);

  const onNotifyMe = useCallback(() => {
    haptic.trigger('selection');
    analytics.trackEvent('coming_soon_notify_me');
    navigate('/');
  }, [navigate, haptic, analytics]);

  return (
    <EuclidComingSoonScreen
      insets={{ top: 0, bottom: 0 }}
      countryCode={countryCode}
      countryName={getCountryName(countryCode)}
      subtitle={
        documentTypeText
          ? `We're working to roll out support for ${documentTypeText}.`
          : "We're working to roll out support for this feature."
      }
      description="If you'd like to be notified when this becomes available, let us know."
      onNotifyPress={onNotifyMe}
      onBack={onDismiss}
      renderFlag={renderFlag}
    />
  );
};
