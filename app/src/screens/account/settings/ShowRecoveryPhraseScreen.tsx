// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import React, { useCallback, useEffect, useRef } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Clipboard from '@react-native-clipboard/clipboard';

import type { RecoveryPhraseVariant } from '@selfxyz/euclid';
import { RecoveryPhraseScreen } from '@selfxyz/euclid';
import { useSelfClient } from '@selfxyz/mobile-sdk-alpha';
import { Description } from '@selfxyz/mobile-sdk-alpha/components';

import Mnemonic from '@/components/Mnemonic';
import useMnemonic from '@/hooks/useMnemonic';
import { ExpandableBottomLayout } from '@/layouts/ExpandableBottomLayout';
import { useSettingStore } from '@/stores/settingStore';
import { getRecoveryPhraseWarningMessage } from '@/utils/crypto/mnemonic';
import { IS_EUCLID_ENABLED } from '@/utils/devUtils';

function useCopyRecoveryPhrase(mnemonic: string[] | undefined) {
  const [copied, setCopied] = React.useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const onCopy = useCallback(() => {
    if (!mnemonic) return;
    Clipboard.setString(mnemonic.join(' '));
    setCopied(true);

    // Clear any existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Set new timeout and store its ID
    timeoutRef.current = setTimeout(() => setCopied(false), 2500);
  }, [mnemonic]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return { copied, onCopy };
}

const ShowRecoveryPhraseScreen: React.FC & {
  statusBarStyle: string;
  statusBarHidden: boolean;
} = () => {
  const { mnemonic, loadMnemonic } = useMnemonic();
  const self = useSelfClient();
  const { copied, onCopy } = useCopyRecoveryPhrase(mnemonic);
  const { setHasViewedRecoveryPhrase } = useSettingStore();

  const onReveal = useCallback(async () => {
    await loadMnemonic();
    setHasViewedRecoveryPhrase(true);
  }, [loadMnemonic, setHasViewedRecoveryPhrase]);

  const insets = useSafeAreaInsets();
  if (IS_EUCLID_ENABLED) {
    const variant: RecoveryPhraseVariant = !mnemonic
      ? 'hidden'
      : copied
        ? 'copied'
        : 'revealed';
    return (
      <>
        <RecoveryPhraseScreen
          insets={insets}
          onReveal={onReveal}
          words={mnemonic}
          onBack={self.goBack}
          variant={variant}
          onCopy={onCopy}
        />
      </>
    );
  }
  return (
    <ExpandableBottomLayout.Layout backgroundColor="white">
      <ExpandableBottomLayout.BottomSection
        backgroundColor="white"
        justifyContent="center"
        gap={20}
      >
        <Mnemonic words={mnemonic} onRevealWords={loadMnemonic} />
        <Description>{getRecoveryPhraseWarningMessage()}</Description>
      </ExpandableBottomLayout.BottomSection>
    </ExpandableBottomLayout.Layout>
  );
};

export default ShowRecoveryPhraseScreen;

ShowRecoveryPhraseScreen.statusBarHidden =
  RecoveryPhraseScreen.statusBar.hidden;
ShowRecoveryPhraseScreen.statusBarStyle = RecoveryPhraseScreen.statusBar.style;
