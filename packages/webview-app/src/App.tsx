// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import type React from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';

import { SelfClientProvider } from './providers/SelfClientProvider';
import { VerificationRequestProvider } from './providers/VerificationRequestProvider';
import { DevModeScreen } from './screens/account/DevModeScreen';
import { NotificationPreferencesScreen } from './screens/account/NotificationPreferencesScreen';
import { SecurityScreen } from './screens/account/SecurityScreen';
import { SettingsScreen } from './screens/account/SettingsScreen';
import { ComingSoonScreen } from './screens/ComingSoonScreen';
import { KeychainDebugScreen } from './screens/debug/KeychainDebugScreen';
import { HomeScreen } from './screens/home/HomeScreen';
import { ConfirmIdentificationScreen } from './screens/onboarding/ConfirmIdentificationScreen';
import { CountryPickerScreen } from './screens/onboarding/CountryPickerScreen';
import { IDSelectionScreen } from './screens/onboarding/IDSelectionScreen';
import { ProviderLaunchScreen } from './screens/onboarding/ProviderLaunchScreen';
import { ProviderResultScreen } from './screens/onboarding/ProviderResultScreen';
import { ProvingScreen } from './screens/proving/ProvingScreen';
import { VerificationResultScreen } from './screens/proving/VerificationResultScreen';
import { KycMockScreen } from './screens/tunnel/KycMockScreen';
import { TourScreen } from './screens/tunnel/TourScreen';
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
          <Route path="/onboarding/provider" element={<ProviderLaunchScreen />} />
          <Route path="/onboarding/provider-result" element={<ProviderResultScreen />} />
          <Route path="/onboarding/confirm" element={<ConfirmIdentificationScreen />} />
          <Route path="/proving" element={<ProvingScreen />} />
          <Route path="/proving/result" element={<VerificationResultScreen />} />
          <Route path="/settings" element={<SettingsScreen />} />
          <Route path="/settings/security" element={<SecurityScreen />} />
          <Route path="/settings/notifications" element={<NotificationPreferencesScreen />} />
          <Route path="/settings/dev-mode" element={<DevModeScreen />} />
          {import.meta.env.DEV && <Route path="/debug/keychain" element={<KeychainDebugScreen />} />}
          <Route path="/account/verified" element={<VerificationResultScreen />} />
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
