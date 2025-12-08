// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
import SDKCountryPickerScreen, {
  statusBar as importedStatusBar,
} from '@selfxyz/mobile-sdk-alpha/onboarding/country-picker-screen';

import { useSafeAreaInsets } from '@/hooks/useSafeAreaInsets';

type CountryPickerScreenComponent = React.FC & {
  statusBar: typeof importedStatusBar;
};

const CountryPickerScreen: CountryPickerScreenComponent = () => {
  const insets = useSafeAreaInsets();
  return <SDKCountryPickerScreen insets={insets} />;
};

export const statusBar = importedStatusBar;
CountryPickerScreen.statusBar = importedStatusBar;

export default CountryPickerScreen;
