// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import type React from 'react';
import { useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import type { RecoveryPhraseVariant } from '@selfxyz/euclid';
import { RecoveryPhraseScreen as EuclidRecoveryPhraseScreen } from '@selfxyz/euclid';

import { useSelfClient } from '../../providers/SelfClientProvider';
import { WEB_SAFE_AREA } from '../../utils/insets';

export const RecoveryPhraseScreen: React.FC = () => {
  const navigate = useNavigate();
  const { analytics, haptic } = useSelfClient();
  const [variant, setVariant] = useState<RecoveryPhraseVariant>('hidden');

  const onBack = useCallback(() => {
    haptic.trigger('selection');
    navigate(-1);
  }, [navigate, haptic]);

  const onReveal = useCallback(() => {
    haptic.trigger('selection');
    analytics.trackEvent('recovery_phrase_revealed');
    setVariant('revealed');
  }, [haptic, analytics]);

  const onCopy = useCallback(() => {
    haptic.trigger('success');
    analytics.trackEvent('recovery_phrase_copied');
  }, [haptic, analytics]);

  return (
    <EuclidRecoveryPhraseScreen
      insets={WEB_SAFE_AREA.insets}
      words={undefined}
      variant={variant}
      onBack={onBack}
      onReveal={onReveal}
      onCopy={onCopy}
      onAppleBackup={() => navigate('/coming-soon')}
      onGoogleBackup={() => navigate('/coming-soon')}
    />
  );
};
