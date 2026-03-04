// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import { useMemo } from 'react';
import { getCountry } from 'react-native-localize';

import { commonNames } from '@selfxyz/new-common';
import { alpha2ToAlpha3 } from '@selfxyz/new-common';

import countryDocumentTypesData from '../data/country-document-types.json';

export interface CountryData {
  [countryCode: string]: string[];
}

function getUserCountryCode(): string | null {
  try {
    const countryCode2Letter = getCountry(); // Returns 2-letter code like "US"
    if (countryCode2Letter) {
      const countryCode3Letter = alpha2ToAlpha3(countryCode2Letter);
      if (countryCode3Letter && commonNames[countryCode3Letter as keyof typeof commonNames]) {
        if (__DEV__) {
          console.log('Detected user country:', countryCode3Letter);
        }
        return countryCode3Letter;
      }
    }
  } catch (error) {
    console.error('Error detecting user country:', error);
  }
  return null;
}

export function useCountries() {
  const countryData = countryDocumentTypesData as CountryData;
  const userCountryCode = useMemo(getUserCountryCode, []);

  const countryList = useMemo(() => {
    const allCountries = Object.keys(countryData).map(countryCode => ({
      key: countryCode,
      countryCode,
    }));

    // Exclude user country from main list since it's shown separately
    if (userCountryCode && countryData[userCountryCode]) {
      return allCountries.filter(c => c.countryCode !== userCountryCode);
    }

    return allCountries;
  }, [countryData, userCountryCode]);

  const showSuggestion = userCountryCode && countryData[userCountryCode];

  return { countryData, countryList, loading: false, userCountryCode, showSuggestion };
}
