// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import { useCallback, useState } from 'react';

import { commonNames } from '@selfxyz/common/constants/countries';
import { CountryPickerScreen as CountryPickerUI, type SafeArea } from '@selfxyz/euclid';

import { RoundFlag } from '../../components';
import { DocumentEvents } from '../../constants/analytics';
import { useSelfClient } from '../../context';
import { useCountries } from '../../documents/useCountries';
import { buttonTap } from '../../haptic';
import { SdkEvents } from '../../types/events';

const CountryPickerScreen: React.FC<SafeArea> & { statusBar: typeof CountryPickerUI.statusBar } = ({
  insets,
}: SafeArea) => {
  const selfClient = useSelfClient();

  const [searchValue, setSearchValue] = useState('');
  const { countryData, countryList, loading, userCountryCode, showSuggestion } = useCountries();

  const onCountrySelect = useCallback(
    (countryCode: string) => {
      buttonTap();
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

  const renderFlag = useCallback((countryCode: string, size: number) => {
    return <RoundFlag countryCode={countryCode} size={size} />;
  }, []);

  const getCountryName = useCallback((countryCode: string) => {
    return commonNames[countryCode as keyof typeof commonNames] || countryCode;
  }, []);

  const onSearchChange = useCallback((value: string) => {
    setSearchValue(value);
  }, []);
  return (
    <CountryPickerUI
      insets={insets}
      isLoading={loading}
      countries={countryList}
      onCountrySelect={onCountrySelect}
      suggestionCountryCode={userCountryCode ?? undefined}
      showSuggestion={!!showSuggestion}
      renderFlag={renderFlag}
      getCountryName={getCountryName}
      searchValue={searchValue}
      onClose={selfClient.goBack}
      onInfoPress={() => selfClient.trackEvent(DocumentEvents.COUNTRY_HELP_TAPPED)}
      onSearchChange={onSearchChange}
      showInfoIcon={false}
    />
  );
};
CountryPickerScreen.displayName = 'CountryPickerScreen';
CountryPickerScreen.statusBar = CountryPickerUI.statusBar;
export default CountryPickerScreen;
