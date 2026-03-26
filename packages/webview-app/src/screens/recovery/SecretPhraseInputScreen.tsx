// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import type React from 'react';
import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

import { LeftArrowIcon, SecretPhraseInputScreen as EuclidSecretPhraseInputScreen } from '@selfxyz/euclid';

import { useSelfClient } from '../../providers/SelfClientProvider';

const insets = { top: 0, bottom: 0 };

// BIP-39 word list subset for validation (mock — real list would come from SDK)
const VALID_WORDS = new Set([
  'abandon',
  'ability',
  'able',
  'about',
  'above',
  'absent',
  'absorb',
  'abstract',
  'absurd',
  'abuse',
  'access',
  'accident',
  'account',
  'accuse',
  'achieve',
  'acid',
  'acoustic',
  'acquire',
  'across',
  'act',
  'action',
  'actor',
  'actress',
  'actual',
]);

export const SecretPhraseInputScreen: React.FC = () => {
  const navigate = useNavigate();
  const { analytics, haptic } = useSelfClient();

  const onBack = useCallback(() => {
    haptic.trigger('selection');
    navigate(-1);
  }, [navigate, haptic]);

  const onSubmit = useCallback(
    (words: string[]) => {
      haptic.trigger('success');
      analytics.trackEvent('recovery_phrase_submitted', { wordCount: words.length });
      navigate('/recovery/success');
    },
    [navigate, haptic, analytics],
  );

  return (
    <EuclidSecretPhraseInputScreen
      insets={insets}
      escapeIcon={({ size, color }) => <LeftArrowIcon size={size} color={color} />}
      onBack={onBack}
      onSubmit={onSubmit}
      validWords={VALID_WORDS}
    />
  );
};
