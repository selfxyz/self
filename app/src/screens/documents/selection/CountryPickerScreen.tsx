// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import type React from 'react';

import SDKCountryPickerScreen from '@selfxyz/mobile-sdk-alpha/onboarding/country-picker-screen';

import { useSafeAreaInsets } from '@/hooks/useSafeAreaInsets';

type CountryPickerScreenComponent = React.FC & {
  statusBar: typeof SDKCountryPickerScreen.statusBar;
};

const CountryPickerScreen: CountryPickerScreenComponent = () => {
  const insets = useSafeAreaInsets();
  return <SDKCountryPickerScreen insets={insets} />;
};

CountryPickerScreen.statusBar = SDKCountryPickerScreen.statusBar;

export default CountryPickerScreen;
