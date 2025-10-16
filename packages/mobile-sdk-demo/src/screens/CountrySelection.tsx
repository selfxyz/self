import SDKCountryPickerScreen from '@selfxyz/mobile-sdk-alpha/onboarding/country-picker-screen';

import ScreenLayout from '../components/ScreenLayout';

export default function CountrySelection({ onBack }: { onBack: () => void }) {
  return (
    <ScreenLayout title="GETTING STARTED" onBack={onBack}>
      <SDKCountryPickerScreen />
    </ScreenLayout>
  );
}
