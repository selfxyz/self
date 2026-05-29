// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import type React from 'react';
import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

import { InviteScreen as EuclidInviteScreen } from '@selfxyz/euclid';

import { useSelfClient } from '../../providers/SelfClientProvider';
import { WEB_SAFE_AREA } from '../../utils/insets';

export const InviteScreen: React.FC = () => {
  const navigate = useNavigate();
  const { analytics, haptic } = useSelfClient();

  const handleBack = useCallback(() => {
    haptic.trigger('selection');
    navigate(-1);
  }, [haptic, navigate]);

  const onShare = useCallback(
    (channel: string) => {
      haptic.trigger('selection');
      analytics.trackEvent('invite_share', { channel });
    },
    [analytics, haptic],
  );

  return (
    <EuclidInviteScreen
      {...WEB_SAFE_AREA}
      onClose={handleBack}
      onMessagesPress={() => onShare('messages')}
      onSharePress={() => onShare('share')}
      onWhatsAppPress={() => onShare('whatsapp')}
      onCopyReferralLinkPress={() => onShare('copy_link')}
    />
  );
};
