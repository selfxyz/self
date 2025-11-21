// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  SectionList,
  StyleSheet,
} from 'react-native';
import { Card, Text, View, XStack, YStack } from 'tamagui';

import { useSelfClient } from '@selfxyz/mobile-sdk-alpha';
import { PointEvents } from '@selfxyz/mobile-sdk-alpha/constants/analytics';
import {
  black,
  blue600,
  slate50,
  slate200,
  slate300,
  slate400,
  slate500,
  white,
} from '@selfxyz/mobile-sdk-alpha/constants/colors';
import { dinot, plexMono } from '@selfxyz/mobile-sdk-alpha/constants/fonts';

import HeartIcon from '@/assets/icons/heart.svg';
import StarBlackIcon from '@/assets/icons/star_black.svg';
import type { PointEvent } from '@/services/points';
import { usePointEventStore } from '@/stores/pointEventStore';

type Section = {
  title: string;
  data: PointEvent[];
};

export type PointHistoryListProps = {
  ListHeaderComponent?:
    | React.ComponentType<Record<string, unknown>>
    | React.ReactElement
    | null;
  onLayout?: () => void;
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

const getIconForEventType = (type: PointEvent['type']) => {
  switch (type) {
    case 'disclosure':
      return <StarBlackIcon width={20} height={20} />;
    default:
      return <HeartIcon width={20} height={20} />;
  }
};

export const PointHistoryList: React.FC<PointHistoryListProps> = ({
  ListHeaderComponent,
  onLayout,
}) => {
  const selfClient = useSelfClient();
  const [refreshing, setRefreshing] = useState(false);
  const pointEvents = usePointEventStore(state => state.getAllPointEvents());
  const isLoading = usePointEventStore(state => state.isLoading);
  const refreshPoints = usePointEventStore(state => state.refreshPoints);
  const refreshIncomingPoints = usePointEventStore(
    state => state.refreshIncomingPoints,
  );
  const loadDisclosureEvents = usePointEventStore(
    state => state.loadDisclosureEvents,
  );

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatDateFull = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString([], {
      month: 'short',
      day: 'numeric',
    });
  };

  const getTimePeriod = useCallback((timestamp: number): string => {
    const now = new Date();
    const eventDate = new Date(timestamp);
    const startOfToday = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
    );
    const startOfThisWeek = new Date(startOfToday);
    startOfThisWeek.setDate(startOfToday.getDate() - startOfToday.getDay());
    const startOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

    if (eventDate >= startOfToday) {
      return TIME_PERIODS.TODAY;
    } else if (eventDate >= startOfThisWeek) {
      return TIME_PERIODS.THIS_WEEK;
    } else if (eventDate >= startOfThisMonth) {
      return TIME_PERIODS.THIS_MONTH;
    } else if (eventDate >= startOfLastMonth) {
      return TIME_PERIODS.MONTH_NAME(eventDate);
    } else {
      return TIME_PERIODS.OLDER;
    }
  }, []);

  const groupedEvents = useMemo(() => {
    const groups: Record<string, PointEvent[]> = {};

    [
      TIME_PERIODS.TODAY,
      TIME_PERIODS.THIS_WEEK,
      TIME_PERIODS.THIS_MONTH,
      TIME_PERIODS.OLDER,
    ].forEach(period => {
      groups[period] = [];
    });

    const monthGroups = new Set<string>();

    pointEvents.forEach(event => {
      const period = getTimePeriod(event.timestamp);
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
      groups[period].push(event);
    });

    const sections: Section[] = [];
    [
      TIME_PERIODS.TODAY,
      TIME_PERIODS.THIS_WEEK,
      TIME_PERIODS.THIS_MONTH,
    ].forEach(period => {
      if (groups[period] && groups[period].length > 0) {
        sections.push({ title: period, data: groups[period] });
      }
    });

    Array.from(monthGroups)
      .sort(
        (a, b) =>
          new Date(groups[b][0].timestamp).getMonth() -
          new Date(groups[a][0].timestamp).getMonth(),
      )
      .forEach(month => {
        sections.push({ title: month, data: groups[month] });
      });

    if (groups[TIME_PERIODS.OLDER] && groups[TIME_PERIODS.OLDER].length > 0) {
      sections.push({
        title: TIME_PERIODS.OLDER,
        data: groups[TIME_PERIODS.OLDER],
      });
    }

    return sections;
  }, [pointEvents, getTimePeriod]);

  const renderItem = useCallback(
    ({
      item,
      index,
      section,
    }: {
      item: PointEvent;
      index: number;
      section: Section;
    }) => {
      const borderRadiusSize = 16;
      const isFirstItem = index === 0;
      const isLastItem = index === section.data.length - 1;

      return (
        <View paddingHorizontal={5}>
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
            >
              <XStack alignItems="center" gap={12}>
                <View height={46} alignItems="center" justifyContent="center">
                  {getIconForEventType(item.type)}
                </View>
                <YStack flex={1}>
                  <Text
                    fontSize={16}
                    color={black}
                    fontWeight="500"
                    fontFamily={dinot}
                  >
                    {item.title}
                  </Text>
                  <Text
                    fontFamily={plexMono}
                    color={slate400}
                    fontSize={14}
                    marginTop={2}
                  >
                    {formatDateFull(item.timestamp)} •{' '}
                    {formatDate(item.timestamp)}
                  </Text>
                </YStack>
                <Text
                  fontSize={18}
                  color={blue600}
                  fontWeight="600"
                  fontFamily={dinot}
                >
                  +{item.points}
                </Text>
              </XStack>
            </Card>
          </YStack>
        </View>
      );
    },
    [],
  );

  const renderSectionHeader = useCallback(
    ({ section }: { section: Section }) => {
      return (
        <View
          paddingHorizontal={20}
          backgroundColor={slate50}
          marginTop={20}
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
    selfClient.trackEvent(PointEvents.REFRESH_HISTORY);
    setRefreshing(true);
    Promise.all([
      refreshPoints(),
      refreshIncomingPoints(),
      loadDisclosureEvents(),
    ]).finally(() => setRefreshing(false));
  }, [selfClient, refreshPoints, refreshIncomingPoints, loadDisclosureEvents]);

  const keyExtractor = useCallback((item: PointEvent) => item.id, []);

  const renderEmptyComponent = useCallback(() => {
    if (isLoading) {
      return (
        <View style={styles.emptyContainer}>
          <ActivityIndicator size="large" color={slate300} />
          <Text color={slate300} marginTop={16}>
            Loading point history...
          </Text>
        </View>
      );
    }
    return (
      <View style={styles.emptyContainer}>
        <Text color={slate300}>No point history available yet.</Text>
        <Text color={slate500} fontSize={14} marginTop={8} textAlign="center">
          Start earning points by completing actions!
        </Text>
      </View>
    );
  }, [isLoading]);

  return (
    <SectionList
      sections={groupedEvents}
      renderItem={renderItem}
      renderSectionHeader={renderSectionHeader}
      keyExtractor={keyExtractor}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
      contentContainerStyle={[
        styles.listContent,
        groupedEvents.length === 0 && styles.emptyList,
      ]}
      showsVerticalScrollIndicator={false}
      stickySectionHeadersEnabled={false}
      ListEmptyComponent={renderEmptyComponent}
      ListHeaderComponent={ListHeaderComponent}
      style={{ marginHorizontal: 15, marginBottom: 25 }}
      onLayout={onLayout}
    />
  );
};

const styles = StyleSheet.create({
  listContent: {
    paddingBottom: 100,
  },
  emptyList: {
    flexGrow: 1,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 5,
  },
});

export default PointHistoryList;
