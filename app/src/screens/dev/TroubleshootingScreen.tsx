// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import { poseidon2 } from 'poseidon-lite';
import React, { useState } from 'react';
import { Alert } from 'react-native';
import { Button, H4, Paragraph, Spinner, Text, YStack } from 'tamagui';

import { hashEndpointWithScope } from '@selfxyz/common/utils/scope';
import {
  black,
  red500,
  slate200,
  slate500,
  teal500,
  white,
} from '@selfxyz/mobile-sdk-alpha/constants/colors';

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
    </YStack>
  );
};

export default TroubleshootingScreen;
