// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import React, { useCallback, useEffect, useState } from 'react';
import { Alert, ScrollView } from 'react-native';
import { Button, Text, XStack, YStack } from 'tamagui';

import {
  slate200,
  slate400,
  slate500,
  slate600,
} from '@selfxyz/mobile-sdk-alpha/constants/colors';
import { dinot } from '@selfxyz/mobile-sdk-alpha/constants/fonts';
import { useSafeBottomPadding } from '@selfxyz/mobile-sdk-alpha/hooks';

import BugIcon from '@/assets/icons/bug_icon.svg';
import ErrorBoundary from '@/components/ErrorBoundary';
import type { FixtureTapeSummary } from '@/integrations/nfc/fixtureCapture';
import {
  deleteAllTapes,
  isFixtureCaptureSupported,
  listTapes,
  readTape,
  shareTape,
  uploadTapeToSentry,
} from '@/integrations/nfc/fixtureCapture';
import { ParameterSection } from '@/screens/dev/components/ParameterSection';
import { TopicToggleButton } from '@/screens/dev/components/TopicToggleButton';
import { useSettingStore } from '@/stores/settingStore';

const DevApduCaptureScreen: React.FC = () => {
  const paddingBottom = useSafeBottomPadding(20);

  const fixtureCaptureEnabled = useSettingStore(
    state => state.fixtureCaptureEnabled,
  );
  const setFixtureCaptureEnabled = useSettingStore(
    state => state.setFixtureCaptureEnabled,
  );

  const [tapes, setTapes] = useState<FixtureTapeSummary[]>([]);

  const refreshTapes = useCallback(async () => {
    try {
      setTapes(await listTapes());
    } catch (e) {
      console.warn('Failed to list fixture tapes', e);
    }
  }, []);

  useEffect(() => {
    refreshTapes().catch(() => undefined);
  }, [refreshTapes]);

  const handlePreview = useCallback(async (tape: FixtureTapeSummary) => {
    const json = await readTape(tape.name);
    if (!json) {
      Alert.alert('Unavailable', 'Could not read this tape.');
      return;
    }
    let pretty = json;
    try {
      pretty = JSON.stringify(JSON.parse(json), null, 2);
    } catch {
      // keep raw
    }
    Alert.alert(tape.name, pretty.slice(0, 3500));
  }, []);

  const handleSentry = useCallback(async (tape: FixtureTapeSummary) => {
    const ok = await uploadTapeToSentry(tape);
    Alert.alert(
      ok ? 'Sent to Sentry' : 'Not sent',
      ok
        ? 'The redacted tape was attached to a Sentry event.'
        : 'Sentry is disabled or the tape could not be read.',
    );
  }, []);

  const handleDeleteAll = useCallback(() => {
    Alert.alert(
      'Delete all tapes',
      'This permanently removes every staged tape from this device.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await deleteAllTapes();
            await refreshTapes();
          },
        },
      ],
    );
  }, [refreshTapes]);

  if (!isFixtureCaptureSupported) {
    return (
      <ErrorBoundary>
        <YStack flex={1} backgroundColor="white" padding="$4" gap="$3">
          <Text fontSize="$5" color={slate600} fontFamily={dinot}>
            APDU fixture capture is unavailable
          </Text>
          <Text fontSize="$3" color={slate400} fontFamily={dinot}>
            Capture is Android-only and requires a native build that includes
            the fixture-capture bridge. Rebuild the Android app after running
            setup-private-modules.
          </Text>
        </YStack>
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary>
      <ScrollView showsVerticalScrollIndicator={false}>
        <YStack
          gap="$3"
          backgroundColor="white"
          flex={1}
          paddingHorizontal="$4"
          paddingTop="$4"
          paddingBottom={paddingBottom}
        >
          <ParameterSection
            icon={<BugIcon />}
            title="Capture"
            description="Record a redacted APDU tape on each scan. Disabling revokes staged tapes."
          >
            <YStack gap="$2">
              <TopicToggleButton
                label="Fixture capture"
                isSubscribed={fixtureCaptureEnabled}
                onToggle={() =>
                  setFixtureCaptureEnabled(!fixtureCaptureEnabled)
                }
              />
              <Text fontSize="$3" color={slate400} fontFamily={dinot}>
                With capture on, run a document scan normally (MRZ + NFC). A
                tape is staged here automatically when the scan ends — on both
                success and failure. Then come back to review and export below.
              </Text>
            </YStack>
          </ParameterSection>

          <ParameterSection
            icon={<BugIcon />}
            title={`Staged tapes (${tapes.length})`}
            description="Preview, share, or send each tape. Preview shows the exact bytes that would be sent."
          >
            <YStack gap="$2">
              <ActionRow label="Refresh" onPress={refreshTapes} />
              {tapes.map(tape => (
                <YStack
                  key={tape.name}
                  borderWidth={1}
                  borderColor={slate200}
                  borderRadius="$2"
                  padding="$3"
                  gap="$2"
                >
                  <Text fontSize="$3" color={slate600} fontFamily={dinot}>
                    {tape.issuingCountry ?? 'unknown'} · {tape.status} ·{' '}
                    {tape.sizeBytes}B
                  </Text>
                  <Text fontSize="$2" color={slate400} fontFamily={dinot}>
                    {tape.name}
                  </Text>
                  <XStack gap="$2" flexWrap="wrap">
                    <SmallButton
                      label="Preview"
                      onPress={() => handlePreview(tape)}
                    />
                    <SmallButton
                      label="Share"
                      onPress={() => shareTape(tape.name)}
                    />
                    <SmallButton
                      label="Sentry"
                      onPress={() => handleSentry(tape)}
                    />
                  </XStack>
                </YStack>
              ))}
              {tapes.length > 0 && (
                <ActionRow
                  label="Delete all"
                  onPress={handleDeleteAll}
                  destructive
                />
              )}
            </YStack>
          </ParameterSection>
        </YStack>
      </ScrollView>
    </ErrorBoundary>
  );
};

interface ActionRowProps {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  destructive?: boolean;
}

const ActionRow: React.FC<ActionRowProps> = ({
  label,
  onPress,
  disabled,
  destructive,
}) => (
  <Button
    style={{ backgroundColor: 'white' }}
    borderColor={slate200}
    borderRadius="$2"
    height="$5"
    padding={0}
    opacity={disabled ? 0.5 : 1}
    disabled={disabled}
    onPress={onPress}
  >
    <XStack width="100%" paddingVertical="$3" paddingHorizontal="$4">
      <Text
        fontSize="$5"
        color={destructive ? '#b91c1c' : slate500}
        fontFamily={dinot}
      >
        {label}
      </Text>
    </XStack>
  </Button>
);

const SmallButton: React.FC<{ label: string; onPress: () => void }> = ({
  label,
  onPress,
}) => (
  <Button
    style={{ backgroundColor: 'white' }}
    borderColor={slate200}
    borderRadius="$2"
    size="$3"
    onPress={onPress}
  >
    <Text fontSize="$3" color={slate500} fontFamily={dinot}>
      {label}
    </Text>
  </Button>
);

export default DevApduCaptureScreen;
