// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  SectionList,
  StyleSheet,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Card, Image, Text, View, XStack, YStack } from 'tamagui';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { CheckSquare2, Wallet, XCircle } from '@tamagui/lucide-icons';

import { BodyText } from '@selfxyz/mobile-sdk-alpha/components';
import {
  black,
  blue100,
  blue600,
  red500,
  slate50,
  slate200,
  slate300,
  slate500,
  white,
} from '@selfxyz/mobile-sdk-alpha/constants/colors';
import { dinot } from '@selfxyz/mobile-sdk-alpha/constants/fonts';

import type { RootStackParamList } from '@/navigation';
import { useProofHistoryStore } from '@/stores/proofHistoryStore';
import type { ProofHistory } from '@/stores/proofTypes';
import { ProofStatus } from '@/stores/proofTypes';
import { extraYPadding } from '@/utils/styleUtils';

type Section = {
  title: string;
  data: ProofHistory[];
};

const TIME_PERIODS = {
  TODAY: 'TODAY',
  THIS_WEEK: 'THIS WEEK',
  THIS_MONTH: 'THIS MONTH',
  MONTH_NAME: (date: Date): string => {
    return date.toLocaleString('default', { month: 'long' }).toUpperCase();
  },
  OLDER: 'OLDER',
};

const ProofHistoryScreen: React.FC = () => {
  const {
    proofHistory,
    isLoading,
    loadMoreHistory,
    resetHistory,
    initDatabase,
    hasMore,
  } = useProofHistoryStore();
  const [refreshing, setRefreshing] = useState(false);
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { bottom } = useSafeAreaInsets();

  useEffect(() => {
    initDatabase();
  }, [initDatabase]);

  useEffect(() => {
    if (!isLoading && refreshing) {
      setRefreshing(false);
    }
  }, [isLoading, refreshing]);

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getTimePeriod = useCallback((timestamp: number): string => {
    const now = new Date();
    const proofDate = new Date(timestamp);

    const startOfToday = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
    );

    const startOfThisWeek = new Date(startOfToday);
    startOfThisWeek.setDate(startOfToday.getDate() - startOfToday.getDay());
    const startOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

    if (proofDate >= startOfToday) {
      return TIME_PERIODS.TODAY;
    } else if (proofDate >= startOfThisWeek) {
      return TIME_PERIODS.THIS_WEEK;
    } else if (proofDate >= startOfThisMonth) {
      return TIME_PERIODS.THIS_MONTH;
    } else if (proofDate >= startOfLastMonth) {
      return TIME_PERIODS.MONTH_NAME(proofDate);
    } else {
      return TIME_PERIODS.OLDER;
    }
  }, []);

  const groupedProofs = useMemo(() => {
    const groups: Record<string, ProofHistory[]> = {};

    [
      TIME_PERIODS.TODAY,
      TIME_PERIODS.THIS_WEEK,
      TIME_PERIODS.THIS_MONTH,
      TIME_PERIODS.OLDER,
    ].forEach(period => {
      groups[period] = [];
    });

    const monthGroups = new Set<string>();

    proofHistory.forEach(proof => {
      const period = getTimePeriod(proof.timestamp);

      if (
        period !== TIME_PERIODS.TODAY &&
        period !== TIME_PERIODS.THIS_WEEK &&
        period !== TIME_PERIODS.THIS_MONTH &&
        period !== TIME_PERIODS.OLDER
      ) {
        monthGroups.add(period);

        if (!groups[period]) {
          groups[period] = [];
        }
      }

      groups[period].push(proof);
    });

    const sections: Section[] = [];

    [
      TIME_PERIODS.TODAY,
      TIME_PERIODS.THIS_WEEK,
      TIME_PERIODS.THIS_MONTH,
    ].forEach(period => {
      if (groups[period] && groups[period].length > 0) {
        sections.push({
          title: period,
          data: groups[period],
        });
      }
    });

    Array.from(monthGroups)
      .sort((a, b) => {
        const monthA = new Date(groups[a][0].timestamp).getMonth();
        const monthB = new Date(groups[b][0].timestamp).getMonth();
        return monthB - monthA;
      })
      .forEach(month => {
        sections.push({
          title: month,
          data: groups[month],
        });
      });

    if (groups[TIME_PERIODS.OLDER] && groups[TIME_PERIODS.OLDER].length > 0) {
      sections.push({
        title: TIME_PERIODS.OLDER,
        data: groups[TIME_PERIODS.OLDER],
      });
    }

    return sections;
  }, [proofHistory, getTimePeriod]);

  const renderItem = useCallback(
    ({
      item,
      index,
      section,
    }: {
      item: ProofHistory;
      index: number;
      section: Section;
    }) => {
      try {
        const disclosures = JSON.parse(item.disclosures);
        const logoSource = item.logoBase64
          ? {
              uri:
                item.logoBase64.startsWith('data:') ||
                item.logoBase64.startsWith('http')
                  ? item.logoBase64
                  : `data:image/png;base64,${item.logoBase64}`,
            }
          : null;

        const disclosureCount = Object.values(disclosures).filter(
          value => value,
        ).length;

        const borderRadiusSize = 16;
        const isFirstItem = index === 0;
        const isLastItem = index === section.data.length - 1;

        return (
          <View paddingHorizontal={20}>
            <YStack gap={8}>
              <Card
                borderTopLeftRadius={isFirstItem ? borderRadiusSize : 0}
                borderTopRightRadius={isFirstItem ? borderRadiusSize : 0}
                borderBottomLeftRadius={isLastItem ? borderRadiusSize : 0}
                borderBottomRightRadius={isLastItem ? borderRadiusSize : 0}
                borderBottomWidth={1}
                borderColor={slate200}
                padded
                backgroundColor={white}
                onPress={() =>
                  navigation.navigate('ProofHistoryDetail', { data: item })
                }
              >
                <XStack alignItems="center">
                  {logoSource && (
                    <Image
                      source={logoSource}
                      width={46}
                      height={46}
                      marginRight={12}
                      borderRadius={3}
                      gap={10}
                      objectFit="contain"
                    />
                  )}
                  <YStack flex={1}>
                    <BodyText
                      style={{ fontSize: 20, color: black, fontWeight: '500' }}
                    >
                      {item.appName}
                    </BodyText>
                    <BodyText style={{ color: slate300, fontSize: 14 }}>
                      {formatDate(item.timestamp)}
                    </BodyText>
                  </YStack>
                  {(item.endpointType === 'staging_celo' ||
                    item.endpointType === 'celo') && (
                    <XStack
                      backgroundColor={blue100}
                      paddingVertical={2}
                      paddingHorizontal={8}
                      borderRadius={4}
                      alignItems="center"
                    >
                      <Wallet color={blue600} height={14} width={14} />
                    </XStack>
                  )}
                  <XStack
                    backgroundColor={blue100}
                    paddingVertical={2}
                    paddingHorizontal={8}
                    borderRadius={4}
                    alignItems="center"
                    marginLeft={4}
                  >
                    <Text
                      color={blue600}
                      fontSize={14}
                      fontWeight="600"
                      marginRight={4}
                    >
                      {disclosureCount}
                    </Text>
                    <CheckSquare2 color={blue600} height={14} width={14} />
                  </XStack>
                  {item.status === ProofStatus.FAILURE && (
                    <XStack
                      paddingVertical={2}
                      paddingHorizontal={8}
                      borderRadius={4}
                      alignItems="center"
                      marginLeft={4}
                    >
                      <Text
                        color={red500}
                        fontSize={14}
                        fontWeight="600"
                        marginRight={4}
                      >
                        FAIL
                      </Text>
                      <XCircle color={red500} height={14} width={14} />
                    </XStack>
                  )}
                </XStack>
              </Card>
            </YStack>
          </View>
        );
      } catch (e) {
        console.error('Error rendering item:', e, item);
        return null;
      }
    },
    [navigation],
  );

  const renderSectionHeader = useCallback(
    ({ section }: { section: Section }) => {
      return (
        <View
          paddingHorizontal={20}
          backgroundColor={slate50}
          marginTop={30}
          marginBottom={12}
          gap={12}
        >
          <Text
            color={slate500}
            fontSize={15}
            fontWeight="500"
            letterSpacing={0.6}
            fontFamily={dinot}
          >
            {section.title.toUpperCase()}
          </Text>
        </View>
      );
    },
    [],
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    resetHistory();
    loadMoreHistory();
  }, [resetHistory, loadMoreHistory]);

  const keyExtractor = useCallback((item: ProofHistory) => item.sessionId, []);

  const handleEndReached = useCallback(() => {
    if (!isLoading && hasMore) {
      loadMoreHistory();
    }
  }, [isLoading, hasMore, loadMoreHistory]);

  const renderEmptyComponent = useCallback(() => {
    if (isLoading) {
      return (
        <View style={styles.emptyContainer}>
          <ActivityIndicator size="large" color={slate300} />
          <Text color={slate300} marginTop={16}>
            Loading history...
          </Text>
        </View>
      );
    }

    return (
      <View style={styles.emptyContainer}>
        <Text color={slate300}>No proof history available</Text>
      </View>
    );
  }, [isLoading]);

  const renderFooter = useCallback(() => {
    if (!isLoading || refreshing) return null;

    return (
      <View style={styles.footerContainer}>
        <ActivityIndicator size="small" color={slate300} />
      </View>
    );
  }, [isLoading, refreshing]);

  return (
    <YStack
      flex={1}
      backgroundColor={slate50}
      paddingBottom={bottom + extraYPadding}
    >
      <SectionList
        sections={groupedProofs}
        renderItem={renderItem}
        renderSectionHeader={renderSectionHeader}
        keyExtractor={keyExtractor}
        onEndReached={handleEndReached}
        onEndReachedThreshold={0.5}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        contentContainerStyle={[
          styles.listContent,
          groupedProofs.length === 0 && styles.emptyList,
        ]}
        showsVerticalScrollIndicator={false}
        stickySectionHeadersEnabled={false}
        ListEmptyComponent={renderEmptyComponent}
        ListFooterComponent={renderFooter}
        initialNumToRender={10}
        maxToRenderPerBatch={10}
        windowSize={10}
        removeClippedSubviews={true}
      />
    </YStack>
  );
};

const styles = StyleSheet.create({
  listContent: {
    paddingBottom: 16,
  },
  emptyList: {
    flexGrow: 1,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 48,
  },
  footerContainer: {
    paddingVertical: 16,
    alignItems: 'center',
  },
});

export default ProofHistoryScreen;
