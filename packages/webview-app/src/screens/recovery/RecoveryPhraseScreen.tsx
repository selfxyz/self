// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import type React from 'react';
import { useCallback, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import type { RecoveryPhraseVariant } from '@selfxyz/euclid';
import { RecoveryPhraseScreen as EuclidRecoveryPhraseScreen } from '@selfxyz/euclid';
import { bridgeStorageAdapter } from '@selfxyz/webview-bridge/adapters';

import { useBridge } from '../../providers/BridgeProvider';
import { useSelfClient } from '../../providers/SelfClientProvider';
import { WEB_SAFE_AREA } from '../../utils/insets';

const MNEMONIC_KEY = 'secret';
const MOCK_MNEMONIC =
  'abandon ability able about above absent absorb abstract absurd abuse access accident account accuse achieve acid acoustic acquire across act action actor actress actual';

function parseMnemonicWords(raw: string | null): string[] | undefined {
  if (!raw) {
    return undefined;
  }

  const parsed = JSON.parse(raw) as string | { phrase?: string };
  const phrase = typeof parsed === 'string' ? parsed : parsed.phrase;
  const words = phrase?.trim().split(/\s+/).filter(Boolean);

  return words && words.length > 0 ? words : undefined;
}

export const RecoveryPhraseScreen: React.FC = () => {
  const navigate = useNavigate();
  const bridge = useBridge();
  const storage = useRef(bridgeStorageAdapter(bridge)).current;
  const { analytics, haptic } = useSelfClient();
  const [variant, setVariant] = useState<RecoveryPhraseVariant>('hidden');
  const [words, setWords] = useState<string[] | undefined>();

  const onBack = useCallback(() => {
    haptic.trigger('selection');
    navigate(-1);
  }, [navigate, haptic]);

  const onReveal = useCallback(async () => {
    haptic.trigger('selection');
    analytics.trackEvent('recovery_phrase_revealed');

    let resolvedWords: string[] | undefined;

    try {
      resolvedWords = parseMnemonicWords(await storage.get(MNEMONIC_KEY));
    } catch {
      // Ignore storage parsing errors and fall through to mock/dev fallback.
    }

    if (!resolvedWords && import.meta.env.DEV) {
      resolvedWords = MOCK_MNEMONIC.split(' ');
    }

    setWords(resolvedWords);
    setVariant('revealed');
  }, [haptic, analytics, storage]);

  const onCopy = useCallback(() => {
    haptic.trigger('success');
    analytics.trackEvent('recovery_phrase_copied');

    if (!words?.length || !navigator.clipboard) {
      return;
    }

    void navigator.clipboard.writeText(words.join(' '));
    setVariant('copied');
  }, [haptic, analytics, words]);

  return (
    <EuclidRecoveryPhraseScreen
      insets={WEB_SAFE_AREA.insets}
      words={words}
      variant={variant}
      onBack={onBack}
      onReveal={onReveal}
      onCopy={onCopy}
      onAppleBackup={() => navigate('/coming-soon')}
      onGoogleBackup={() => navigate('/coming-soon')}
    />
  );
};
