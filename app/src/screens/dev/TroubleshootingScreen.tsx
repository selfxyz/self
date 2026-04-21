// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import { poseidon2 } from 'poseidon-lite';
import React, { useState } from 'react';
import { Button, Spinner, Text, YStack } from 'tamagui';

import { hashEndpointWithScope } from '@selfxyz/common/utils/scope';
import {
  black,
  slate200,
  slate500,
  teal500,
  white,
} from '@selfxyz/mobile-sdk-alpha/constants/colors';

import { unsafe_getPrivateKey } from '@/providers/authProvider';
import { POINTS_API_BASE_URL } from '@/services/points/constants';
import { getPointsAddress } from '@/services/points/utils';

const POINTS_ENDPOINT = '0x829d183faaa675f8f80e8bb25fb1476cd4f7c1f0';
const POINTS_SCOPE = 'minimal-disclosure-quest';

const FixDisclosureScreen: React.FC = () => {
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

      const scopeHash = hashEndpointWithScope(POINTS_ENDPOINT, POINTS_SCOPE);
      const nullifier = poseidon2([
        BigInt(secret),
        BigInt(scopeHash),
      ]).toString();
      const userAddress = await getPointsAddress();

      console.log(userAddress);

      const response = await fetch(
        `${POINTS_API_BASE_URL}/points-disclose-fix`,
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
        <Text fontSize="$3" color={status === 'error' ? '#ef4444' : teal500}>
          {message}
        </Text>
      )}
    </YStack>
  );
};

export default FixDisclosureScreen;
