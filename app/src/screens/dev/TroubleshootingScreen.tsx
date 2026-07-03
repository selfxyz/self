// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import { poseidon2 } from 'poseidon-lite';
import React, { useState } from 'react';
import { Alert } from 'react-native';
import { Button, H4, Paragraph, Spinner, Text, XStack, YStack } from 'tamagui';

import { hashEndpointWithScope } from '@selfxyz/common/utils/scope';
import {
  amber500,
  black,
  red500,
  slate200,
  slate500,
  teal500,
  white,
} from '@selfxyz/mobile-sdk-alpha/constants/colors';

import { useNfcDebugRun } from '@/hooks/useNfcDebugRun';
import { isFixtureCaptureSupported } from '@/integrations/nfc/fixtureCapture';
import { unsafe_getPrivateKey } from '@/providers/authProvider';
import { TopicToggleButton } from '@/screens/dev/components/TopicToggleButton';
import {
  POINTS_API_BASE_URL,
  POINTS_API_ROUTES,
  POINTS_SELF_APP_ENDPOINT,
  POINTS_SELF_APP_SCOPE,
} from '@/services/points/constants';
import { getPointsAddress } from '@/services/points/utils';
import { useSettingStore } from '@/stores/settingStore';
import type { NfcDebugTone } from '@/utils/nfcDebugOutcome';
import { describeOutcome } from '@/utils/nfcDebugOutcome';

const FixtureCaptureToggle: React.FC = () => {
  const enabled = useSettingStore(state => state.fixtureCaptureEnabled);
  const setEnabled = useSettingStore(state => state.setFixtureCaptureEnabled);

  if (!isFixtureCaptureSupported) {
    return null;
  }

  const onToggle = () => {
    if (enabled) {
      setEnabled(false);
      return;
    }
    Alert.alert(
      'Share NFC diagnostic logs?',
      'When on, a redacted log of each scan is stored on this device so you can share it with us to debug failed reads.\n\nKept: chip type, issuing country, command sequence, status codes.\nNever included: your name, photo, document number, or biometrics.\n\nNothing is sent automatically — you choose when to share. Turning this off deletes any stored logs.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Enable', onPress: () => setEnabled(true) },
      ],
    );
  };

  return (
    <YStack gap="$2">
      <H4>NFC diagnostic logs</H4>
      <Paragraph color={slate500}>
        Record a redacted log of each passport scan to help us debug failed
        reads. Off by default; logs stay on this device until you share them.
      </Paragraph>
      <TopicToggleButton
        label="Diagnostic capture"
        isSubscribed={enabled}
        onToggle={onToggle}
      />
    </YStack>
  );
};

const TONE_COLOR: Record<NfcDebugTone, string> = {
  success: teal500,
  warn: amber500,
  error: red500,
};

const PHASE_LABEL: Record<string, string> = {
  starting: 'Starting…',
  waiting: 'Waiting for passport…',
  running: 'Analyzing…',
};

const NfcDebugSection: React.FC = () => {
  const { state, result, error, run, reset, hasMrz, isSupported } =
    useNfcDebugRun();

  if (!isSupported) {
    return null;
  }

  const busy =
    state === 'starting' || state === 'waiting' || state === 'running';

  const onPress = () => {
    Alert.alert(
      'Debug my passport read?',
      'Our team can debug why your passport read failed. While you hold your passport on the phone, only redacted protocol data (chip type, command sequence, status codes) is shared.\n\nYour name, photo, document number, and biometrics never leave this device.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Start', onPress: () => run().catch(() => undefined) },
      ],
    );
  };

  // Phase-aware progress line so a long run reads as "working", not frozen. The
  // done line's color reflects the outcome (a dropped connection is not a clean
  // success), so it carries an explicit color alongside the text.
  const statusLine = ((): { text: string; color: string } | null => {
    if (state === 'starting') {
      return { text: 'Starting a secure debug session…', color: slate500 };
    }
    if (state === 'waiting') {
      return {
        text: 'Hold your passport flat against the phone and keep it there…',
        color: slate500,
      };
    }
    if (state === 'running') {
      return {
        text: 'Connected — analyzing your passport. Keep holding it still; this can take a minute.',
        color: slate500,
      };
    }
    if (state === 'done' && result) {
      const outcome = describeOutcome(result);
      return { text: outcome.message, color: TONE_COLOR[outcome.tone] };
    }
    return null;
  })();

  return (
    <YStack gap="$2">
      <H4>Debug my passport read</H4>
      <Paragraph color={slate500}>
        Let our team debug a failed passport scan. Your document details stay on
        this device — only redacted protocol data is shared.
      </Paragraph>
      <XStack gap="$2">
        <Button
          flex={1}
          backgroundColor={black}
          color={white}
          borderColor={slate200}
          borderRadius="$3"
          height="$5"
          disabled={busy || !hasMrz}
          opacity={busy || !hasMrz ? 0.5 : 1}
          onPress={onPress}
        >
          {busy ? (
            <XStack gap="$2" alignItems="center">
              <Spinner color={white} />
              <Text color={white}>{PHASE_LABEL[state] ?? 'Working…'}</Text>
            </XStack>
          ) : (
            'Debug my passport read'
          )}
        </Button>
        {busy ? (
          <Button
            backgroundColor={slate200}
            color={black}
            borderRadius="$3"
            height="$5"
            onPress={() => reset()}
          >
            Cancel
          </Button>
        ) : null}
      </XStack>
      {!hasMrz ? (
        <Text fontSize="$3" color={slate500}>
          Scan your passport first, then come back here.
        </Text>
      ) : null}
      {statusLine ? (
        <Text fontSize="$3" color={statusLine.color}>
          {statusLine.text}
        </Text>
      ) : null}
      {state === 'error' && error ? (
        <Text fontSize="$3" color={red500}>
          {error}
        </Text>
      ) : null}
    </YStack>
  );
};

const TroubleshootingScreen: React.FC = () => {
  const [status, setStatus] = useState<
    'idle' | 'loading' | 'success' | 'error'
  >('idle');
  const [message, setMessage] = useState('');

  const handleFix = async () => {
    setStatus('loading');
    setMessage('');

    try {
      const secret = await unsafe_getPrivateKey();
      if (!secret) {
        setStatus('error');
        setMessage(
          'Could not retrieve secret. Biometric auth may have failed.',
        );
        return;
      }

      const scopeHash = hashEndpointWithScope(
        POINTS_SELF_APP_ENDPOINT,
        POINTS_SELF_APP_SCOPE,
      );
      const nullifier = poseidon2([
        BigInt(secret),
        BigInt(scopeHash),
      ]).toString();
      const userAddress = await getPointsAddress();

      const response = await fetch(
        `${POINTS_API_BASE_URL}${POINTS_API_ROUTES.discloseFix}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            nullifier,
            points_address: userAddress.toLowerCase(),
          }),
        },
      );

      if (!response.ok) {
        const data = await response.json().catch(() => null);
        setStatus('error');
        setMessage(data?.message ?? `Request failed (${response.status})`);
        return;
      }

      setStatus('success');
      setMessage('Disclosure status fixed successfully.');
    } catch (error) {
      setStatus('error');
      setMessage(
        error instanceof Error
          ? error.message
          : 'An unexpected error occurred.',
      );
    }
  };

  return (
    <YStack padding="$4" gap="$4">
      <YStack gap="$2">
        <H4>Fix points disclosure</H4>
        <Paragraph color={slate500}>
          If your points haven't updated after a successful verification, tap
          below to repair your disclosure state. This is safe to run more than
          once.
        </Paragraph>
      </YStack>

      <Button
        backgroundColor={status === 'success' ? teal500 : black}
        color={white}
        borderColor={slate200}
        borderRadius="$3"
        height="$5"
        disabled={status === 'loading'}
        onPress={handleFix}
      >
        {status === 'loading' ? (
          <Spinner color={white} />
        ) : status === 'success' ? (
          'Fixed'
        ) : (
          'Fix Points Issue'
        )}
      </Button>

      {message !== '' && (
        <Text fontSize="$3" color={status === 'error' ? red500 : teal500}>
          {message}
        </Text>
      )}

      <FixtureCaptureToggle />

      <NfcDebugSection />
    </YStack>
  );
};

export default TroubleshootingScreen;
