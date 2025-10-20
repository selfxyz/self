import IDSelectionScreen from '@selfxyz/mobile-sdk-alpha/onboarding/id-selection-screen';

import ScreenLayout from '../components/ScreenLayout';

export default function IDSelection({ onBack }: { onBack: () => void }) {
  return (
    <ScreenLayout title="GETTING STARTED" onBack={onBack}>
      <IDSelectionScreen countryCode="USA" documentTypes={['p']} />
    </ScreenLayout>
  );
}
