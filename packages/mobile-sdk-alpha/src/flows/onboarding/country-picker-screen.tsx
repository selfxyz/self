// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import { memo, useCallback } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, TouchableOpacity, View } from 'react-native';

import { commonNames } from '@selfxyz/common/constants/countries';

import { BodyText, RoundFlag, XStack, YStack } from '../../components';
import { black, slate100, slate500 } from '../../constants/colors';
import { advercase, dinot } from '../../constants/fonts';
import { useSelfClient } from '../../context';
import { useCountries } from '../../documents/useCountries';
import { buttonTap } from '../../haptic';
import { SdkEvents } from '../../types/events';

interface CountryListItem {
  key: string;
  countryCode: string;
}

const ITEM_HEIGHT = 65;
const FLAG_SIZE = 32;

const CountryItem = memo<{
  countryCode: string;
  onSelect: (code: string) => void;
}>(({ countryCode, onSelect }) => {
  const countryName = commonNames[countryCode as keyof typeof commonNames];

  if (!countryName) return null;

  return (
    <TouchableOpacity onPress={() => onSelect(countryCode)} style={styles.countryItemContainer}>
      <XStack style={styles.countryItemContent}>
        <RoundFlag countryCode={countryCode} size={FLAG_SIZE} />
        <BodyText style={styles.countryItemText}>{countryName}</BodyText>
      </XStack>
    </TouchableOpacity>
  );
});

CountryItem.displayName = 'CountryItem';

const Loading = () => (
  <View style={styles.loadingContainer}>
    <ActivityIndicator size="small" />
  </View>
);
Loading.displayName = 'Loading';

const CountryPickerScreen: React.FC = () => {
  const selfClient = useSelfClient();

  const { countryData, countryList, loading, userCountryCode, showSuggestion } = useCountries();

  const onPressCountry = useCallback(
    (countryCode: string) => {
      buttonTap();
      // if (__DEV__) {
      //   console.log('Selected country code:', countryCode);
      //   console.log('Current countryData:', countryData);
      //   console.log('Available country codes:', Object.keys(countryData));
      // }
      const documentTypes = countryData[countryCode];
      if (__DEV__) {
        console.log('documentTypes for', countryCode, ':', documentTypes);
      }

      if (documentTypes && documentTypes.length > 0) {
        const countryName = commonNames[countryCode as keyof typeof commonNames] || countryCode;

        // Emit the country selection event
        selfClient.emit(SdkEvents.DOCUMENT_COUNTRY_SELECTED, {
          countryCode: countryCode,
          countryName: countryName,
          documentTypes: documentTypes,
        });
      } else {
        selfClient.emit(SdkEvents.PROVING_PASSPORT_NOT_SUPPORTED, {
          countryCode: countryCode,
          documentCategory: null,
        });
      }
    },
    [countryData, selfClient],
  );

  const renderItem = useCallback(
    ({ item }: { item: CountryListItem }) => <CountryItem countryCode={item.countryCode} onSelect={onPressCountry} />,
    [onPressCountry],
  );

  const keyExtractor = useCallback((item: CountryListItem) => item.countryCode, []);

  const getItemLayout = useCallback(
    (_data: ArrayLike<CountryListItem> | null | undefined, index: number) => ({
      length: ITEM_HEIGHT,
      offset: ITEM_HEIGHT * index,
      index,
    }),
    [],
  );

  return (
    <YStack flex={1} paddingTop="$4" paddingHorizontal="$4" backgroundColor={slate100}>
      <YStack marginTop="$4" marginBottom="$6">
        <BodyText style={styles.titleText}>Select the country that issued your ID</BodyText>
        <BodyText style={styles.subtitleText}>
          Self has support for over 300 ID types. You can select the type of ID in the next step
        </BodyText>
      </YStack>
      {loading ? (
        <Loading />
      ) : (
        <YStack flex={1}>
          {showSuggestion && (
            <YStack marginBottom="$2">
              <BodyText style={styles.sectionLabel}>SUGGESTION</BodyText>
              <CountryItem
                countryCode={userCountryCode as string /*safe due to showSuggestion*/}
                onSelect={onPressCountry}
              />
              <BodyText style={styles.sectionLabelBottom}>SELECT AN ISSUING COUNTRY</BodyText>
            </YStack>
          )}
          <FlatList
            data={countryList}
            renderItem={renderItem}
            keyExtractor={keyExtractor}
            showsVerticalScrollIndicator={false}
            removeClippedSubviews={true}
            maxToRenderPerBatch={10}
            windowSize={10}
            initialNumToRender={10}
            updateCellsBatchingPeriod={50}
            getItemLayout={getItemLayout}
          />
        </YStack>
      )}
    </YStack>
  );
};
CountryPickerScreen.displayName = 'CountryPickerScreen';

const styles = StyleSheet.create({
  countryItemContainer: {
    paddingVertical: 13,
  },
  countryItemContent: {
    alignItems: 'center',
    gap: 16,
  },
  countryItemText: {
    fontSize: 16,
    color: black,
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  titleText: {
    fontSize: 29,
    fontFamily: advercase,
    color: black,
  },
  subtitleText: {
    fontSize: 16,
    color: slate500,
    marginTop: 20,
  },
  sectionLabel: {
    fontSize: 16,
    color: black,
    fontFamily: dinot,
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  sectionLabelBottom: {
    fontSize: 16,
    color: black,
    fontFamily: dinot,
    letterSpacing: 0.8,
    marginTop: 20,
  },
});

export default CountryPickerScreen;
