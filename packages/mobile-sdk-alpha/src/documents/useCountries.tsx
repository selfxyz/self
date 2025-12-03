// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import { useEffect, useMemo, useState } from 'react';
import { getCountry } from 'react-native-localize';

import { commonNames } from '@selfxyz/common';
import { alpha2ToAlpha3 } from '@selfxyz/common/constants/countries';

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
  const [countryData, setCountryData] = useState<CountryData>({});
  const [loading, setLoading] = useState(true);
  const userCountryCode = useMemo(getUserCountryCode, []);

  useEffect(() => {
    const controller = new AbortController();
    const fetchCountryData = async () => {
      try {
        const response = await fetch('https://api.staging.self.xyz/id-picker', {
          signal: controller.signal,
        });
        const result = await response.json();

        if (result.status === 'success') {
          setCountryData(result.data);
          // if (__DEV__) {
          //   console.log('Set country data:', result.data);
          // }
        } else {
          console.error('API returned non-success status:', result.status);
        }
      } catch (error) {
        console.error('Error fetching country data:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchCountryData();
    return () => controller.abort();
  }, []);

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

  return { countryData, countryList, loading, userCountryCode, showSuggestion };
}
