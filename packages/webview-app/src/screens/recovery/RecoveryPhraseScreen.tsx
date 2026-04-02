// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import type React from 'react';
import { useCallback, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

import type { RecoveryPhraseVariant } from '@selfxyz/euclid';
import { RecoveryPhraseScreen as EuclidRecoveryPhraseScreen } from '@selfxyz/euclid';
import { bridgeStorageAdapter } from '@selfxyz/webview-bridge/adapters';

import { useBridge } from '../../providers/BridgeProvider';
import { useSelfClient } from '../../providers/SelfClientProvider';
import { WEB_SAFE_AREA } from '../../utils/insets';
import { getPromptMockFromSearch, getPromptMockSearch, shouldUseHistoryBack } from '../../utils/mockOnboardingFlow';
import { MNEMONIC_KEY } from '../../utils/secretManager';

function parseMnemonicWords(raw: string | null): string[] | undefined {
  if (!raw) {
    return undefined;
  }

  let phrase = raw;

  try {
    const parsed = JSON.parse(raw) as string | { phrase?: string };
    phrase = typeof parsed === 'string' ? parsed : (parsed.phrase ?? raw);
  } catch {
    phrase = raw;
  }

  const words = phrase?.trim().split(/\s+/).filter(Boolean);

  return words && words.length > 0 ? words : undefined;
}

interface RecoveryPhraseScreenBaseProps {
  onBack: () => void;
  onAppleBackup: () => void;
  onGoogleBackup: () => void;
}

const RecoveryPhraseScreenBase: React.FC<RecoveryPhraseScreenBaseProps> = ({
  onBack,
  onAppleBackup,
  onGoogleBackup,
}) => {
  const bridge = useBridge();
  const storage = useRef(bridgeStorageAdapter(bridge)).current;
  const { analytics, haptic } = useSelfClient();
  const [variant, setVariant] = useState<RecoveryPhraseVariant>('hidden');
  const [words, setWords] = useState<string[] | undefined>();

  const handleBack = useCallback(() => {
    haptic.trigger('selection');
    onBack();
  }, [haptic, onBack]);

  const onReveal = useCallback(async () => {
    haptic.trigger('selection');
    analytics.trackEvent('recovery_phrase_revealed');

    let resolvedWords: string[] | undefined;

    try {
      resolvedWords = parseMnemonicWords(await storage.get(MNEMONIC_KEY));
    } catch {
      // Storage or parsing failed — words stay undefined, Euclid shows placeholders.
    }

    setWords(resolvedWords);
    setVariant('revealed');
  }, [haptic, analytics, storage]);

  const onCopy = useCallback(async () => {
    analytics.trackEvent('recovery_phrase_copied');

    if (!words?.length || !navigator.clipboard) {
      return;
    }

    try {
      await navigator.clipboard.writeText(words.join(' '));
      haptic.trigger('success');
      setVariant('copied');
    } catch {
      haptic.trigger('error');
    }
  }, [haptic, analytics, words]);

  return (
    <EuclidRecoveryPhraseScreen
      insets={WEB_SAFE_AREA.insets}
      words={words}
      variant={variant}
      onBack={handleBack}
      onReveal={onReveal}
      onCopy={onCopy}
      onAppleBackup={onAppleBackup}
      onGoogleBackup={onGoogleBackup}
    />
  );
};

export const OnboardingRecoveryPhraseScreen: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const mock = getPromptMockFromSearch(location.search);
  const notificationsPath = `/onboarding/notifications${getPromptMockSearch(mock)}`;
  const successPath = `/onboarding/success${getPromptMockSearch(mock)}`;

  const onBack = useCallback(() => {
    if (shouldUseHistoryBack()) {
      navigate(-1);
      return;
    }

    navigate(successPath);
  }, [navigate, successPath]);

  const advanceToNotifications = useCallback(() => {
    navigate(notificationsPath);
  }, [navigate, notificationsPath]);

  return (
    <RecoveryPhraseScreenBase
      onBack={onBack}
      onAppleBackup={advanceToNotifications}
      onGoogleBackup={advanceToNotifications}
    />
  );
};

export const RecoveryPhraseScreen: React.FC = () => {
  const navigate = useNavigate();

  return (
    <RecoveryPhraseScreenBase
      onBack={() => navigate(-1)}
      onAppleBackup={() => navigate('/coming-soon')}
      onGoogleBackup={() => navigate('/coming-soon')}
    />
  );
};
