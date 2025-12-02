// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import React, { useMemo } from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { Card, Image, Text, XStack, YStack } from 'tamagui';
import { CheckSquare2, Info, Wallet } from '@tamagui/lucide-icons';

import {
  black,
  blue100,
  blue600,
  blue700,
  emerald500,
  red500,
  slate100,
  slate700,
  white,
  zinc400,
  zinc500,
} from '@selfxyz/mobile-sdk-alpha/constants/colors';
import {
  advercase,
  dinot,
  plexMono,
} from '@selfxyz/mobile-sdk-alpha/constants/fonts';

import type { ProofHistory } from '@/stores/proofTypes';
import { ProofStatus } from '@/stores/proofTypes';

type ProofHistoryDetailScreenProps = {
  route: {
    params: {
      data: ProofHistory;
    };
  };
};

enum DisclosureType {
  NAME = 'name',
  OFAC = 'ofac',
  AGE = 'age',
  ISSUING_STATE = 'issuing_state',
  PASSPORT_NUMBER = 'passport_number',
  NATIONALITY = 'nationality',
  DATE_OF_BIRTH = 'date_of_birth',
  GENDER = 'gender',
  EXPIRY_DATE = 'expiry_date',
  EXCLUDED_COUNTRIES = 'excludedCountries',
  MINIMUM_AGE = 'minimumAge',
}

const ProofHistoryDetailScreen: React.FC<ProofHistoryDetailScreenProps> = ({
  route,
}) => {
  const { data } = route.params;
  const disclosures = useMemo(() => {
    const parsedDisclosures = JSON.parse(data.disclosures);
    const result: string[] = [];

    Object.entries(parsedDisclosures).forEach(([key, value]) => {
      if (key === DisclosureType.MINIMUM_AGE && value) {
        result.push(`Age is over ${value}`);
      }
      if (key === DisclosureType.NAME && value) {
        result.push(`Disclosed Name to ${data.appName}`);
      }
      if (key === DisclosureType.OFAC && value) {
        result.push(`Not on the OFAC list`);
      }
      if (key === DisclosureType.AGE && value) {
        result.push(`Disclosed Age to ${data.appName}`);
      }
      if (key === DisclosureType.ISSUING_STATE && value) {
        result.push(`Disclosed Issuing State to ${data.appName}`);
      }
      if (key === DisclosureType.PASSPORT_NUMBER && value) {
        result.push(`Disclosed Passport Number to ${data.appName}`);
      }
      if (key === DisclosureType.NATIONALITY && value) {
        result.push(`Disclosed Nationality to ${data.appName}`);
      }
      if (key === DisclosureType.DATE_OF_BIRTH && value) {
        result.push(`Disclosed Date of Birth to ${data.appName}`);
      }
      if (key === DisclosureType.GENDER && value) {
        result.push(`Disclosed Gender to ${data.appName}`);
      }
      if (key === DisclosureType.EXPIRY_DATE && value) {
        result.push(`Disclosed Expiry Date to ${data.appName}`);
      }
      if (key === DisclosureType.EXCLUDED_COUNTRIES) {
        if (value && Array.isArray(value) && value.length > 0) {
          result.push(`Disclosed - Not from excluded countries`);
        }
      }
    });
    return result;
  }, [data.appName, data.disclosures]);

  // TODO: fix timestamp format
  const formattedDate = useMemo(() => {
    return new Date(data.timestamp).toLocaleString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }, [data.timestamp]);

  const proofStatus = useMemo(() => {
    if (data.status === 'success') {
      return 'PROOF GRANTED';
    } else if (data.status === ProofStatus.PENDING) {
      return 'PROOF PENDING';
    } else {
      return 'PROOF FAILED';
    }
  }, [data.status]);

  const logoSource = useMemo(() => {
    if (!data.logoBase64) {
      return null;
    }

    if (
      data.logoBase64.startsWith('http://') ||
      data.logoBase64.startsWith('https://')
    ) {
      return { uri: data.logoBase64 };
    }

    const base64String = data.logoBase64.startsWith('data:image')
      ? data.logoBase64
      : `data:image/png;base64,${data.logoBase64}`;
    return { uri: base64String };
  }, [data.logoBase64]);

  const isEthereumAddress = useMemo(() => {
    return (
      /^0x[a-fA-F0-9]+$/.test(data.userId) &&
      (data.endpointType === 'staging_celo' || data.endpointType === 'celo') &&
      data.userIdType === 'hex'
    );
  }, [data.userId, data.endpointType, data.userIdType]);

  return (
    <YStack flex={1} backgroundColor={white}>
      <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
        <YStack flex={1} padding={20}>
          <YStack
            backgroundColor={black}
            borderBottomLeftRadius={0}
            borderBottomRightRadius={0}
            borderTopLeftRadius={10}
            borderTopRightRadius={10}
            paddingBottom={20}
          >
            <YStack alignItems="center" gap={12} marginTop={40}>
              {/* TODO: add background gradient */}
              {logoSource && (
                <Image
                  source={logoSource}
                  width={60}
                  height={60}
                  borderRadius={16}
                  objectFit="contain"
                />
              )}
              <Text
                color={white}
                fontSize={28}
                fontWeight={400}
                letterSpacing={1}
                fontFamily={advercase}
              >
                {data.appName}
              </Text>
              <Text
                color={zinc500}
                fontSize={12}
                fontWeight={500}
                fontFamily={plexMono}
              >
                {data.appName}
              </Text>
            </YStack>

            <YStack alignItems="center" paddingHorizontal={20} marginTop={20}>
              <Text
                color={zinc400}
                fontSize={16}
                textAlign="center"
                fontWeight={500}
                fontFamily={dinot}
              >
                <Text color={white}>{data.appName}</Text> was granted access to
                the following information from your verified{' '}
                <Text color={white}>Passport.</Text>
              </Text>
            </YStack>
          </YStack>

          <YStack
            backgroundColor={blue100}
            paddingVertical={12}
            paddingHorizontal={20}
          >
            <XStack alignItems="center" gap={8}>
              <CheckSquare2 color={blue600} size={12} />
              <Text
                color={blue600}
                fontSize={12}
                fontWeight={500}
                fontFamily={plexMono}
              >
                {proofStatus}
              </Text>
              <Text
                color={blue600}
                fontSize={12}
                marginLeft="auto"
                fontWeight={500}
                fontFamily={plexMono}
              >
                {formattedDate}
              </Text>
            </XStack>
          </YStack>

          <Card
            backgroundColor={slate100}
            elevation={1}
            padding={20}
            gap={20}
            borderTopLeftRadius={0}
            borderTopRightRadius={0}
            borderBottomLeftRadius={10}
            borderBottomRightRadius={10}
          >
            <YStack gap={10}>
              <YStack
                backgroundColor={isEthereumAddress ? blue600 : white}
                paddingTop={12}
                paddingBottom={12}
                paddingLeft={10}
                paddingRight={6}
                borderRadius={4}
                style={
                  isEthereumAddress
                    ? styles.connectedWalletContainer
                    : styles.walletContainer
                }
              >
                <XStack
                  backgroundColor={isEthereumAddress ? blue700 : slate100}
                  paddingVertical={4}
                  paddingHorizontal={6}
                  borderRadius={4}
                  alignItems="center"
                  gap={8}
                >
                  <Wallet
                    color={isEthereumAddress ? white : zinc400}
                    size={12}
                  />
                  <Text
                    color={isEthereumAddress ? white : zinc400}
                    fontSize={12}
                    fontWeight={500}
                    fontFamily={plexMono}
                    textTransform={'uppercase'}
                  >
                    {isEthereumAddress
                      ? 'CONNECTED WALLET ADDRESS'
                      : 'NO CONNECTED WALLET'}
                  </Text>
                  {isEthereumAddress && (
                    <Text
                      color={white}
                      fontSize={12}
                      marginLeft="auto"
                      fontWeight="500"
                      ellipsizeMode="tail"
                    >
                      {data.userId.slice(0, 2)}...{data.userId.slice(-4)}
                    </Text>
                  )}
                </XStack>
              </YStack>

              <YStack gap={16}>
                {disclosures.map((disclosure, index) => (
                  <XStack
                    key={index}
                    backgroundColor={slate100}
                    paddingVertical={16}
                    paddingHorizontal={10}
                    borderRadius={12}
                    alignItems="center"
                  >
                    <YStack
                      backgroundColor={
                        data.status === ProofStatus.SUCCESS
                          ? emerald500
                          : red500
                      }
                      width={8}
                      height={8}
                      borderRadius={4}
                      marginRight={12}
                    />
                    <Text
                      color={slate700}
                      fontSize={12}
                      flex={1}
                      fontWeight={500}
                      letterSpacing={0.48}
                      fontFamily={dinot}
                      textTransform={'uppercase'}
                    >
                      {disclosure}
                    </Text>
                    <Info color={blue600} size={16} fontWeight={700} />
                  </XStack>
                ))}
              </YStack>
            </YStack>
          </Card>
        </YStack>
      </ScrollView>
    </YStack>
  );
};

const styles = StyleSheet.create({
  walletContainer: {
    shadowColor: blue600,
  },
  connectedWalletContainer: {
    shadowColor: blue700,
  },
});

export default ProofHistoryDetailScreen;
