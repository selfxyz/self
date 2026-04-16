// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import type React from 'react';
import { useCallback, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

import {
  borderRadius,
  colors,
  fontFamily,
  fontWeight,
  LeftArrowIcon,
  RecoveryPhrase,
  RecoveryPhraseScreen as EuclidRecoveryPhraseScreen,
  type RecoveryPhraseVariant,
  spacing,
  TopNavigationDialogue,
} from '@selfxyz/euclid';
import { bridgeStorageAdapter } from '@selfxyz/webview-bridge/adapters';

import { useBridge } from '../../providers/BridgeProvider';
import { useSelfClient } from '../../providers/SelfClientProvider';
import { WEB_SAFE_AREA } from '../../utils/insets';
import { getPromptMockFromSearch, getPromptMockSearch } from '../../utils/mockOnboardingFlow';
import { ensureSecret, MNEMONIC_KEY } from '../../utils/secretManager';

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

const DEV_FAKE_MNEMONIC =
  'jump car stuff tiger camp core wasp dream harlem sales mistake wish expose moose dribble noodle tornado peanut install install meat snail truck virgo';

function getDevFallbackMnemonicWords(): string[] | undefined {
  if (!import.meta.env.DEV) {
    return undefined;
  }

  return DEV_FAKE_MNEMONIC.split(' ');
}

async function resolveMnemonicWords(storage: ReturnType<typeof bridgeStorageAdapter>): Promise<string[] | undefined> {
  try {
    await ensureSecret(storage);
    const storedWords = parseMnemonicWords(await storage.get(MNEMONIC_KEY));
    return storedWords ?? getDevFallbackMnemonicWords();
  } catch {
    return getDevFallbackMnemonicWords();
  }
}

interface RecoveryPhraseScreenBaseProps {
  onBack: () => void;
  onAppleBackup: () => void;
  onGoogleBackup: () => void;
}

const recoveryPhrasePlaceholderWords = [
  '***#****',
  '****',
  '****&****',
  '(*****',
  '***#',
  '*****#********',
  '********',
  '**#**',
  '#*******',
  '******',
  '***',
  '*****#********',
  '**#***',
  '******',
  '******',
  '#**#',
  '********',
  '****',
  '!******',
  '*******',
  '***#*********',
  '*******',
  '******',
  '******',
];

const copy = {
  navigationLabel: 'Recovery Phrase',
  infoTitle: 'Back up your account',
  infoDescriptionPrimary:
    'Your secret recovery phrase is used to restore your account if you lose your phone or need to reinstall the Self app.',
  infoDescriptionSecondary:
    'Save these 24 words in a secure location, such as a password manager, and never share them with anyone.',
  revealButtonLabel: 'Tap to reveal',
};

const settingsStyles = {
  container: {
    display: 'flex',
    flexDirection: 'column' as const,
    flex: 1,
    backgroundColor: colors.slate50,
  },
  header: {
    backgroundColor: colors.slate50,
  },
  scrollView: {
    flex: 1,
    overflowY: 'auto' as const,
  },
  scrollContent: {
    paddingLeft: spacing.mdLg,
    paddingRight: spacing.mdLg,
    paddingBottom: spacing.xlLg,
  },
  content: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: spacing.mdLg,
    paddingTop: spacing.mdLg,
  },
  infoBox: {
    backgroundColor: colors.blue50,
    borderWidth: 1,
    borderStyle: 'solid' as const,
    borderColor: colors.blue100,
    borderRadius: borderRadius.mdd,
    overflow: 'hidden' as const,
  },
  infoBoxContent: {
    padding: spacing.mdLg,
    display: 'flex',
    flexDirection: 'column' as const,
    gap: spacing.mdLg,
  },
  infoTextContainer: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: spacing.smLg,
  },
  infoTitle: {
    fontFamily: fontFamily.dinOT,
    fontWeight: fontWeight.medium,
    fontSize: 18,
    color: colors.black,
    lineHeight: '22px',
  },
  infoDescriptionContainer: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: spacing.smPlus,
  },
  infoDescription: {
    fontFamily: fontFamily.dinOT,
    fontWeight: fontWeight.medium,
    fontSize: 14,
    color: colors.slate500,
    lineHeight: '20px',
  },
  recoveryPhraseContainer: {
    width: '100%',
    flex: 1,
    minHeight: 0,
  },
};

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

    const resolvedWords = await resolveMnemonicWords(storage);
    if (!resolvedWords?.length) {
      haptic.trigger('error');
      return;
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

const SettingsRecoveryPhraseScreen: React.FC<{ onBack: () => void }> = ({ onBack }) => {
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

    const resolvedWords = await resolveMnemonicWords(storage);
    if (!resolvedWords?.length) {
      haptic.trigger('error');
      return;
    }
    setWords(resolvedWords);
    setVariant('revealed');
  }, [analytics, haptic, storage]);

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
  }, [analytics, haptic, words]);

  return (
    <div style={settingsStyles.container}>
      <div style={settingsStyles.header}>
        <TopNavigationDialogue
          variant="Primary"
          label={copy.navigationLabel}
          escapeIcon={({ size, color }) => <LeftArrowIcon size={size} color={color} />}
          infoIcon={({ size }) => <div style={{ width: size, height: size }} />}
          onEscape={handleBack}
          onPressInfo={() => {}}
        />
      </div>
      <div style={settingsStyles.scrollView}>
        <div style={settingsStyles.scrollContent}>
          <div style={settingsStyles.content}>
            <div style={settingsStyles.infoBox}>
              <div style={settingsStyles.infoBoxContent}>
                <div style={settingsStyles.infoTextContainer}>
                  <span style={settingsStyles.infoTitle}>{copy.infoTitle}</span>
                  <div style={settingsStyles.infoDescriptionContainer}>
                    <span style={settingsStyles.infoDescription}>{copy.infoDescriptionPrimary}</span>
                    <span style={settingsStyles.infoDescription}>{copy.infoDescriptionSecondary}</span>
                  </div>
                </div>
              </div>
            </div>
            <div style={settingsStyles.recoveryPhraseContainer}>
              <RecoveryPhrase
                variant={variant}
                words={words || recoveryPhrasePlaceholderWords}
                onReveal={onReveal}
                onCopy={onCopy}
                revealButtonText={copy.revealButtonLabel}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export const OnboardingRecoveryPhraseScreen: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const mock = getPromptMockFromSearch(location.search);
  const notificationsPath = `/onboarding/notifications${getPromptMockSearch(mock)}`;
  const successPath = `/onboarding/success${getPromptMockSearch(mock)}`;

  const onBack = useCallback(() => {
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

  return <SettingsRecoveryPhraseScreen onBack={() => navigate(-1)} />;
};
