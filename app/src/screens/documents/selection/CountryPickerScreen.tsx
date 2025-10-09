// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import { memo, useCallback } from 'react';
import { FlatList, TouchableOpacity, View } from 'react-native';
import { Spinner, XStack, YStack } from 'tamagui';

import { commonNames } from '@selfxyz/common/constants/countries';
import {
  SdkEvents,
  useCountries,
  useSelfClient,
} from '@selfxyz/mobile-sdk-alpha';

import { RoundFlag } from '@/components/flag/RoundFlag';
import { DocumentFlowNavBar } from '@/components/NavBar/DocumentFlowNavBar';
import { BodyText } from '@/components/typography/BodyText';
import { black, slate100, slate500 } from '@/utils/colors';
import { advercase, dinot } from '@/utils/fonts';
import { buttonTap } from '@/utils/haptic';

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
    <TouchableOpacity
      onPress={() => onSelect(countryCode)}
      style={{
        paddingVertical: 13,
      }}
    >
      <XStack alignItems="center" gap={16}>
        <RoundFlag countryCode={countryCode} size={FLAG_SIZE} />
        <BodyText fontSize={16} color={black} flex={1}>
          {countryName}
        </BodyText>
      </XStack>
    </TouchableOpacity>
  );
});

CountryItem.displayName = 'CountryItem';

const CountryPickerScreen: React.FC = () => {
  const selfClient = useSelfClient();

  const { countryData, countryList, loading, userCountryCode, showSuggestion } =
    useCountries();

  const onPressCountry = useCallback(
    (countryCode: string) => {
      buttonTap();
      if (__DEV__) {
        console.log('Selected country code:', countryCode);
        console.log('Current countryData:', countryData);
        console.log('Available country codes:', Object.keys(countryData));
      }
      const documentTypes = countryData[countryCode];
      if (__DEV__) {
        console.log('documentTypes for', countryCode, ':', documentTypes);
      }

      if (documentTypes && documentTypes.length > 0) {
        const countryName =
          commonNames[countryCode as keyof typeof commonNames] || countryCode;

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
    ({ item }: { item: CountryListItem }) => (
      <CountryItem countryCode={item.countryCode} onSelect={onPressCountry} />
    ),
    [onPressCountry],
  );

  const keyExtractor = useCallback(
    (item: CountryListItem) => item.countryCode,
    [],
  );

  const renderLoadingState = () => (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <Spinner size="small" />
    </View>
  );

  const getItemLayout = useCallback(
    (_data: ArrayLike<CountryListItem> | null | undefined, index: number) => ({
      length: ITEM_HEIGHT,
      offset: ITEM_HEIGHT * index,
      index,
    }),
    [],
  );

  return (
    <YStack flex={1} backgroundColor={slate100}>
      <DocumentFlowNavBar title="GETTING STARTED" />
      <YStack flex={1} paddingTop="$4" paddingHorizontal="$4">
        <YStack marginTop="$4" marginBottom="$6">
          <BodyText fontSize={29} fontFamily={advercase}>
            Select the country that issued your ID
          </BodyText>
          <BodyText fontSize={16} color={slate500} marginTop="$3">
            Self has support for over 300 ID types. You can select the type of
            ID in the next step
          </BodyText>
        </YStack>
        {loading ? (
          renderLoadingState()
        ) : (
          <YStack flex={1}>
            {showSuggestion && (
              <YStack marginBottom="$2">
                <BodyText
                  fontSize={16}
                  color={black}
                  fontFamily={dinot}
                  letterSpacing={0.8}
                  marginBottom="$1"
                >
                  SUGGESTION
                </BodyText>
                <CountryItem
                  countryCode={
                    userCountryCode as string /*safe due to showSuggestion*/
                  }
                  onSelect={onPressCountry}
                />
                <BodyText
                  fontSize={16}
                  color={black}
                  fontFamily={dinot}
                  letterSpacing={0.8}
                  marginTop="$4"
                >
                  SELECT AN ISSUING COUNTRY
                </BodyText>
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
    </YStack>
  );
};

export default CountryPickerScreen;
