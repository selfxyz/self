// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { SelfClientProvider } from './providers/SelfClientProvider';
import { VerificationRequestProvider } from './providers/VerificationRequestProvider';
import { CountryPickerScreen } from './screens/onboarding/CountryPickerScreen';
import { IDSelectionScreen } from './screens/onboarding/IDSelectionScreen';
import { ConfirmIdentificationScreen } from './screens/onboarding/ConfirmIdentificationScreen';
import { ProviderLaunchScreen } from './screens/onboarding/ProviderLaunchScreen';
import { HomeScreen } from './screens/home/HomeScreen';
import { ProvingScreen } from './screens/proving/ProvingScreen';
import { VerificationResultScreen } from './screens/proving/VerificationResultScreen';
import { SettingsScreen } from './screens/account/SettingsScreen';
import { SecurityScreen } from './screens/account/SecurityScreen';
import { NotificationPreferencesScreen } from './screens/account/NotificationPreferencesScreen';
import { DevModeScreen } from './screens/account/DevModeScreen';
import { ComingSoonScreen } from './screens/ComingSoonScreen';
import { TourScreen } from './screens/tunnel/TourScreen';
import { KycMockScreen } from './screens/tunnel/KycMockScreen';
import { TunnelCountryPickerScreen } from './screens/tunnel/TunnelCountryPickerScreen';
import { TunnelIDTypeScreen } from './screens/tunnel/TunnelIDTypeScreen';
import { TunnelProofReceiptScreen } from './screens/tunnel/TunnelProofReceiptScreen';
import { TunnelProvingScreen } from './screens/tunnel/TunnelProvingScreen';
import { TunnelResultScreen } from './screens/tunnel/TunnelResultScreen';

export const App: React.FC = () => (
  <BrowserRouter>
    <VerificationRequestProvider>
      <SelfClientProvider>
        <Routes>
          <Route path="/" element={<HomeScreen />} />
          <Route path="/onboarding/country" element={<CountryPickerScreen />} />
          <Route path="/onboarding/id-type" element={<IDSelectionScreen />} />
          <Route
            path="/onboarding/provider"
            element={<ProviderLaunchScreen />}
          />
          <Route
            path="/onboarding/confirm"
            element={<ConfirmIdentificationScreen />}
          />
          <Route path="/proving" element={<ProvingScreen />} />
          <Route path="/proving/result" element={<VerificationResultScreen />} />
          <Route path="/settings" element={<SettingsScreen />} />
          <Route path="/settings/security" element={<SecurityScreen />} />
          <Route path="/settings/notifications" element={<NotificationPreferencesScreen />} />
          <Route path="/settings/dev-mode" element={<DevModeScreen />} />
          <Route
            path="/account/verified"
            element={<VerificationResultScreen />}
          />
          <Route path="/coming-soon" element={<ComingSoonScreen />} />
          <Route path="/tunnel/tour/:step" element={<TourScreen />} />
          <Route path="/tunnel/kyc" element={<KycMockScreen />} />
          <Route path="/tunnel/registration/country" element={<TunnelCountryPickerScreen />} />
          <Route path="/tunnel/registration/id-type" element={<TunnelIDTypeScreen />} />
          <Route path="/tunnel/proof/receipt" element={<TunnelProofReceiptScreen />} />
          <Route path="/tunnel/proof/generating" element={<TunnelProvingScreen />} />
          <Route path="/tunnel/proof/result" element={<TunnelResultScreen />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </SelfClientProvider>
    </VerificationRequestProvider>
  </BrowserRouter>
);
