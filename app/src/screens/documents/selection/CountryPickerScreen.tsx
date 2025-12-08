// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import SDKCountryPickerScreen, {
  statusBar as importedStatusBar,
} from '@selfxyz/mobile-sdk-alpha/onboarding/country-picker-screen';

import { useSafeAreaInsets } from '@/hooks/useSafeAreaInsets';

function CountryPickerScreen() {
  const insets = useSafeAreaInsets();
  return <SDKCountryPickerScreen insets={insets} />;
}

export const statusBar = importedStatusBar;
CountryPickerScreen.statusBar = importedStatusBar;

export default CountryPickerScreen;
