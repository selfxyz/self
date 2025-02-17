import {
  black,
  slate50,
  slate200,
  slate300,
  slate500,
  teal500,
  white,
} from '../utils/colors';
import Clipboard from '@react-native-clipboard/clipboard';
import React, { useCallback, useState } from 'react';
import { Button, Text, XStack, YStack } from 'tamagui';

interface MnemonicProps {
  words?: string[];
  onRevealWords?: () => Promise<void>;
}
interface WordPill {
  index: number;
  word: string;
}
const WordPill = ({ index, word }: WordPill) => {
  return (
    <XStack
      key={index}
      borderColor={slate300}
      backgroundColor={white}
      borderWidth="$0.5"
      borderRadius="$2"
      padding={4}
      minWidth={26}
      gap={4}
    >
      <Text color={slate300} fontSize={14} fontWeight={500}>
        {index}
      </Text>
      <Text color={slate500} fontSize={14} fontWeight={500}>
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
  const copyToClipboardOrReveal = useCallback(async () => {
    if (!revealWords) {
      // TODO: container jumps when words are revealed on android
      await onRevealWords?.();
      return setRevealWords(previous => !previous);
    }
    Clipboard.setString(words.join(' '));
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  }, [words, revealWords]);

  return (
    <YStack position="relative" alignItems="stretch" gap={0}>
      <XStack
        borderColor={slate200}
        backgroundColor={slate50}
        borderWidth="$1"
        borderBottomWidth={0}
        borderTopLeftRadius="$5"
        borderTopRightRadius="$5"
        gap={12}
        paddingHorizontal={26}
        paddingVertical={28}
        flexWrap="wrap"
      >
        {(revealWords ? words : REDACTED).map((word, i) => (
          <WordPill key={i} word={word} index={i} />
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
          py="$2"
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
