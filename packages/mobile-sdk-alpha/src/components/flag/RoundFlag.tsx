// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import type React from 'react';
import { View } from 'react-native';
import * as CountryFlags from 'react-native-svg-circle-country-flags';

import { alpha3ToAlpha2 } from '@selfxyz/common/constants/countries';

import { slate300 } from '../../constants/colors';

type CountryFlagComponent = React.ComponentType<{
  width: number;
  height: number;
}>;

type CountryFlagsRecord = Record<string, CountryFlagComponent>;

interface RoundFlagProps {
  countryCode: string;
  size: number;
}

const findFlagComponent = (CountryFlags: CountryFlagsRecord, formattedCode: string) => {
  const patterns = [
    formattedCode,
    formattedCode.toLowerCase(),
    formattedCode.charAt(0).toUpperCase() + formattedCode.charAt(1).toLowerCase(),
  ];

  for (const pattern of patterns) {
    const component = CountryFlags[pattern];
    if (component) {
      return component;
    }
  }
  return null;
};

const getCountryFlag = (countryCode: string): CountryFlagComponent | null => {
  try {
    const normalizedCountryCode = countryCode === 'D<<' ? 'DEU' : countryCode;
    const iso2 = alpha3ToAlpha2(normalizedCountryCode);
    if (!iso2) {
      return null;
    }

    const formattedCode = iso2.toUpperCase();
    return findFlagComponent(CountryFlags as unknown as CountryFlagsRecord, formattedCode);
  } catch (error) {
    console.error('Error getting country flag:', error);
    return null;
  }
};

export const RoundFlag: React.FC<RoundFlagProps> = ({ countryCode, size }) => {
  const CountryFlagComponent = getCountryFlag(countryCode);

  if (!CountryFlagComponent) {
    return (
      <View
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: slate300,
        }}
      />
    );
  }

  return (
    <View style={{ alignItems: 'center' }}>
      <CountryFlagComponent width={size} height={size} />
    </View>
  );
};
