// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import { poseidon2 } from 'poseidon-lite';
import React, { useCallback, useState } from 'react';
import { Alert, StyleSheet, Switch, View } from 'react-native';
import { Button, ScrollView, Spinner, XStack, YStack } from 'tamagui';
import type { RouteProp } from '@react-navigation/native';
import {
  useFocusEffect,
  useNavigation,
  useRoute,
} from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { hashEndpointWithScope } from '@selfxyz/common/utils/scope';
import { BodyText } from '@selfxyz/mobile-sdk-alpha/components';
import {
  amber500,
  black,
  blue600,
  red500,
  slate100,
  slate200,
  slate500,
  teal500,
  white,
} from '@selfxyz/mobile-sdk-alpha/constants/colors';
import { dinot } from '@selfxyz/mobile-sdk-alpha/constants/fonts';

import ErrorBoundary from '@/components/ErrorBoundary';
import { useNfcDebugRun } from '@/hooks/useNfcDebugRun';
import { isFixtureCaptureSupported } from '@/integrations/nfc/fixtureCapture';
import type { RootStackParamList } from '@/navigation';
import type { DevRoutesParamList } from '@/navigation/types';
import { unsafe_getPrivateKey } from '@/providers/authProvider';
import {
  POINTS_API_BASE_URL,
  POINTS_API_ROUTES,
  POINTS_SELF_APP_ENDPOINT,
  POINTS_SELF_APP_SCOPE,
} from '@/services/points/constants';
import { getPointsAddress } from '@/services/points/utils';
import { useSettingStore } from '@/stores/settingStore';
import { ensureCameraForPassportScan } from '@/utils/cameraPermission';
import type { NfcDebugTone } from '@/utils/nfcDebugOutcome';
import { describeOutcome } from '@/utils/nfcDebugOutcome';

const FixtureCaptureToggle: React.FC = () => {
  const enabled = useSettingStore(state => state.fixtureCaptureEnabled);
  const setEnabled = useSettingStore(state => state.setFixtureCaptureEnabled);

  if (!isFixtureCaptureSupported) {
    return null;
  }

  const onToggle = (next: boolean) => {
    if (!next) {
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
    <View style={styles.settingRow}>
      <View style={styles.settingTextContainer}>
        <BodyText style={styles.settingLabel}>NFC diagnostic logs</BodyText>
        <BodyText style={styles.settingDescription}>
          Keep a redacted log of each passport scan to help us debug failed
          reads. Off by default; logs stay on this device until you share them.
        </BodyText>
      </View>
      <Switch
        value={enabled}
        onValueChange={onToggle}
        trackColor={{ false: slate200, true: blue600 }}
        thumbColor={white}
        testID="fixture-capture-toggle"
      />
    </View>
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
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<DevRoutesParamList, 'Troubleshooting'>>();
  const { state, result, error, run, reset, hasMrz, isSupported } =
    useNfcDebugRun();

  const busy =
    state === 'starting' || state === 'waiting' || state === 'running';

  // With no MRZ on file, detour through the normal camera-scan flow. Marking
  // our own route lets DataConfirmation pop back here with `run` instead of
  // continuing to the NFC scan; the mark dies with the route on every
  // abandonment path, so no cleanup is needed. Never clear `pending` here — a
  // clear-on-focus would race the setParams below.
  const startScanDetour = useCallback(async () => {
    if (!(await ensureCameraForPassportScan())) {
      return;
    }
    navigation.setParams({ nfcDebug: 'pending' });
    navigation.navigate('DocumentCamera');
  }, [navigation]);

  // Consent was granted before the detour, so the returned `run` signal starts
  // the debug run without re-prompting.
  useFocusEffect(
    useCallback(() => {
      if (route.params?.nfcDebug !== 'run') {
        return;
      }
      navigation.setParams({ nfcDebug: undefined });
      if (hasMrz && !busy) {
        run().catch(() => undefined);
      }
    }, [route.params?.nfcDebug, hasMrz, busy, run, navigation]),
  );

  if (!isSupported) {
    return null;
  }

  const onPress = () => {
    Alert.alert(
      'Debug my passport read?',
      'Our team can debug why your passport read failed. While you hold your passport on the phone, only redacted protocol data (chip type, command sequence, status codes) is shared.\n\nYour name, photo, document number, and biometrics never leave this device.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Start',
          onPress: () =>
            (hasMrz ? run() : startScanDetour()).catch(() => undefined),
        },
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
    <YStack gap={8}>
      <BodyText style={styles.settingLabel}>Debug my passport read</BodyText>
      <BodyText style={styles.settingDescription}>
        Let our team debug a failed passport scan. Your document details stay on
        this device — only redacted protocol data is shared.
      </BodyText>
      <XStack gap={8} marginTop={4}>
        <Button
          flex={1}
          backgroundColor={black}
          borderRadius={12}
          disabled={busy}
          opacity={busy ? 0.6 : 1}
          onPress={onPress}
          testID="nfc-debug-run"
        >
          {busy ? (
            <XStack gap={8} alignItems="center">
              <Spinner color={white} />
              <BodyText style={{ color: white }}>
                {PHASE_LABEL[state] ?? 'Working…'}
              </BodyText>
            </XStack>
          ) : (
            <BodyText style={{ color: white }}>Debug my passport read</BodyText>
          )}
        </Button>
        {busy ? (
          <Button
            backgroundColor={white}
            borderColor={slate200}
            borderWidth={1}
            borderRadius={12}
            onPress={() => reset()}
            testID="nfc-debug-cancel"
          >
            <BodyText style={{ color: black }}>Cancel</BodyText>
          </Button>
        ) : null}
      </XStack>
      {!hasMrz ? (
        <BodyText style={styles.hintText}>
          We'll ask you to scan your passport's photo page first.
        </BodyText>
      ) : null}
      {statusLine ? (
        <BodyText style={[styles.hintText, { color: statusLine.color }]}>
          {statusLine.text}
        </BodyText>
      ) : null}
      {state === 'error' && error ? (
        <BodyText style={[styles.hintText, { color: red500 }]}>
          {error}
        </BodyText>
      ) : null}
    </YStack>
  );
};

const PointsFixSection: React.FC = () => {
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
    <YStack gap={8}>
      <BodyText style={styles.settingLabel}>Fix points disclosure</BodyText>
      <BodyText style={styles.settingDescription}>
        If your points haven't updated after a successful verification, tap
        below to repair your disclosure state. This is safe to run more than
        once.
      </BodyText>
      <Button
        backgroundColor={status === 'success' ? teal500 : black}
        borderRadius={12}
        marginTop={4}
        disabled={status === 'loading'}
        onPress={handleFix}
        testID="points-fix-run"
      >
        {status === 'loading' ? (
          <Spinner color={white} />
        ) : (
          <BodyText style={{ color: white }}>
            {status === 'success' ? 'Fixed' : 'Fix points issue'}
          </BodyText>
        )}
      </Button>
      {message !== '' && (
        <BodyText
          style={[
            styles.hintText,
            { color: status === 'error' ? red500 : teal500 },
          ]}
        >
          {message}
        </BodyText>
      )}
    </YStack>
  );
};

const TroubleshootingScreen: React.FC = () => (
  <ErrorBoundary>
    <ScrollView flex={1} backgroundColor={slate100}>
      <YStack padding={20} gap={28}>
        <NfcDebugSection />
        <PointsFixSection />
        <FixtureCaptureToggle />
      </YStack>
    </ScrollView>
  </ErrorBoundary>
);

const styles = StyleSheet.create({
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
  },
  settingTextContainer: {
    flex: 1,
    gap: 4,
  },
  settingLabel: {
    fontSize: 16,
    fontFamily: dinot,
    fontWeight: '500',
    color: black,
  },
  settingDescription: {
    fontSize: 14,
    fontFamily: dinot,
    color: slate500,
  },
  hintText: {
    fontSize: 13,
    fontFamily: dinot,
    color: slate500,
  },
});

export default TroubleshootingScreen;
