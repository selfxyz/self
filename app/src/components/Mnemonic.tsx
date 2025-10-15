// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import React, { useCallback, useMemo, useState } from 'react';
import { Button, Text, XStack, YStack } from 'tamagui';
import Clipboard from '@react-native-clipboard/clipboard';

import { useSettingStore } from '@/stores/settingStore';
import useCompactLayout from '@/hooks/useCompactLayout';
import {
  black,
  slate50,
  slate200,
  slate300,
  slate500,
  teal500,
  white,
} from '@/utils/colors';
import { confirmTap } from '@/utils/haptic';

interface MnemonicProps {
  words?: string[];
  onRevealWords?: () => Promise<void>;
}
interface WordPill {
  index: number;
  word: string;
  compact: boolean;
}
const WordPill = ({ index, word, compact }: WordPill) => {
  return (
    <XStack
      key={index}
      borderColor={slate300}
      backgroundColor={white}
      borderWidth="$0.5"
      borderRadius="$2"
      padding={compact ? 3 : 4}
      minWidth={compact ? 22 : 26}
      gap={compact ? 3 : 4}
    >
      <Text color={slate300} fontSize={compact ? 13 : 14} fontWeight={500}>
        {index}
      </Text>
      <Text color={slate500} fontSize={compact ? 13 : 14} fontWeight={500}>
        {word}
      </Text>
    </XStack>
  );
};
const REDACTED = new Array(24)
  .fill('')
  .map(_ => '*'.repeat(Math.max(4, Math.floor(Math.random() * 10))));
const Mnemonic = ({ words = REDACTED, onRevealWords }: MnemonicProps) => {
  const [revealWords, setRevealWords] = useState(false);
  const [copied, setCopied] = useState(false);
  const { setHasViewedRecoveryPhrase } = useSettingStore();
  const { isCompactWidth, selectResponsiveValue } = useCompactLayout();
  const containerSpacing = useMemo(
    () => ({
      paddingHorizontal: selectResponsiveValue(18, 26, 'width'),
      paddingVertical: selectResponsiveValue(22, 28, 'width'),
      gap: selectResponsiveValue(10, 12, 'width'),
    }),
    [selectResponsiveValue],
  );
  const buttonPadding = selectResponsiveValue(12, 16, 'width');
  const copyToClipboardOrReveal = useCallback(async () => {
    confirmTap();
    if (!revealWords) {
      // TODO: container jumps when words are revealed on android
      await onRevealWords?.();
      setHasViewedRecoveryPhrase(true);
      return setRevealWords(previous => !previous);
    }
    Clipboard.setString(words.join(' '));
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  }, [onRevealWords, revealWords, setHasViewedRecoveryPhrase, words]);

  return (
    <YStack position="relative" alignItems="stretch" gap={0}>
      <XStack
        borderColor={slate200}
        backgroundColor={slate50}
        borderWidth="$1"
        borderBottomWidth={0}
        borderTopLeftRadius="$5"
        borderTopRightRadius="$5"
        gap={containerSpacing.gap}
        paddingHorizontal={containerSpacing.paddingHorizontal}
        paddingVertical={containerSpacing.paddingVertical}
        flexWrap="wrap"
      >
        {(revealWords ? words : REDACTED).map((word, i) => (
          <WordPill
            key={i}
            word={word}
            index={i}
            compact={isCompactWidth}
          />
        ))}
      </XStack>
      <XStack
        borderTopColor={slate200}
        borderTopWidth="$1"
        justifyContent="center"
        alignItems="stretch"
      >
        <Button
          unstyled
          color={revealWords ? (copied ? black : white) : black}
          borderColor={revealWords ? (copied ? teal500 : black) : slate200}
          backgroundColor={revealWords ? (copied ? teal500 : black) : slate50}
          borderWidth="$1"
          borderTopWidth={0}
          borderBottomLeftRadius="$5"
          borderBottomRightRadius="$5"
          paddingVertical={buttonPadding}
          onPress={copyToClipboardOrReveal}
          width="100%"
          textAlign="center"
        >
          {revealWords
            ? `${copied ? 'COPIED' : 'COPY'} TO CLIPBOARD`
            : 'TAP TO REVEAL'}
        </Button>
      </XStack>
    </YStack>
  );
};

export default Mnemonic;
