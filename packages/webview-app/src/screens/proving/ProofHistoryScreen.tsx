// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import type React from 'react';
import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

import {
  LeftArrowIcon,
  ProofHistoryScreen as EuclidProofHistoryScreen,
  SelfLogo,
  ShieldLockIcon,
} from '@selfxyz/euclid';

import { useSelfClient } from '../../providers/SelfClientProvider';
import { WEB_SAFE_AREA } from '../../utils/insets';

const MOCK_PROOF_HISTORY = [
  {
    id: '1',
    appName: 'Aave',
    timestamp: 'Yesterday',
    icon: <SelfLogo size={32} />,
    onPress: () => {},
  },
  {
    id: '2',
    appName: 'Binance',
    timestamp: '2 days ago',
    icon: <SelfLogo size={32} />,
    onPress: () => {},
  },
  {
    id: '3',
    appName: 'Coinbase',
    timestamp: 'Last week',
    icon: <SelfLogo size={32} />,
    onPress: () => {},
  },
];

export const ProofHistoryScreen: React.FC = () => {
  const navigate = useNavigate();
  const { analytics, haptic } = useSelfClient();

  const handleClose = useCallback(() => {
    haptic.trigger('selection');
    navigate('/', { replace: true });
  }, [navigate, haptic]);

  const onInfoPress = useCallback(() => {
    haptic.trigger('selection');
    analytics.trackEvent('proof_history_info_pressed');
  }, [haptic, analytics]);

  const onViewIdData = useCallback(() => {
    haptic.trigger('selection');
    analytics.trackEvent('proof_history_view_id_pressed');
    navigate('/coming-soon');
  }, [navigate, haptic, analytics]);

  return (
    <EuclidProofHistoryScreen
      insets={WEB_SAFE_AREA.insets}
      onClose={handleClose}
      onInfoPress={onInfoPress}
      onViewIdData={onViewIdData}
      proofHistory={MOCK_PROOF_HISTORY}
      idCard={{
        variant: 'passport',
        title: 'Passport',
        subtitle: 'Registered',
      }}
      closeIcon={({ size, color }) => <LeftArrowIcon size={size} color={color} />}
      infoIcon={({ size, color }) => <ShieldLockIcon size={size} color={color} />}
    />
  );
};
