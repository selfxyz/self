import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

import { HomeScreen } from './screens/home/HomeScreen';
import { CountryPickerScreen } from './screens/onboarding/CountryPickerScreen';
import { IDSelectionScreen } from './screens/onboarding/IDSelectionScreen';
import { DocumentCameraScreen } from './screens/onboarding/DocumentCameraScreen';
import { DocumentNFCScreen } from './screens/onboarding/DocumentNFCScreen';
import { ConfirmIdentificationScreen } from './screens/onboarding/ConfirmIdentificationScreen';
import { ProvingScreen } from './screens/proving/ProvingScreen';
import { VerificationResultScreen } from './screens/proving/VerificationResultScreen';
import { SettingsScreen } from './screens/account/SettingsScreen';
import { ComingSoonScreen } from './screens/ComingSoonScreen';

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <Routes>
        {/* Home */}
        <Route path="/" element={<HomeScreen />} />

        {/* Onboarding flow */}
        <Route path="/onboarding/country" element={<CountryPickerScreen />} />
        <Route path="/onboarding/id-type" element={<IDSelectionScreen />} />
        <Route path="/onboarding/camera" element={<DocumentCameraScreen />} />
        <Route path="/onboarding/nfc" element={<DocumentNFCScreen />} />
        <Route path="/onboarding/confirm" element={<ConfirmIdentificationScreen />} />

        {/* Proving flow */}
        <Route path="/proving" element={<ProvingScreen />} />
        <Route path="/proving/result" element={<VerificationResultScreen />} />

        {/* Account */}
        <Route path="/settings" element={<SettingsScreen />} />
        <Route path="/account/verified" element={<VerificationResultScreen />} />

        {/* Misc */}
        <Route path="/coming-soon" element={<ComingSoonScreen />} />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
};
