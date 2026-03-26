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
import { KycFailureScreen } from './screens/onboarding/KycFailureScreen';
import { ProviderLaunchScreen } from './screens/onboarding/ProviderLaunchScreen';
import { ProviderResultScreen } from './screens/onboarding/ProviderResultScreen';
import { RegistrationFailureScreen } from './screens/onboarding/RegistrationFailureScreen';
import { ScanSuccessScreen } from './screens/onboarding/ScanSuccessScreen';
import { TourScreen } from './screens/onboarding/TourScreen';
import { DialogueWithCtaScreen } from './screens/proving/DialogueWithCtaScreen';
import { KycPendingScreen } from './screens/proving/KycPendingScreen';
import { KycVerificationSuccessScreen } from './screens/proving/KycVerificationSuccessScreen';
import { NovaSplashScreen } from './screens/proving/NovaSplashScreen';
import { ProofGenerationDialogueScreen } from './screens/proving/ProofGenerationDialogueScreen';
import { ProofGenerationSuccessScreen } from './screens/proving/ProofGenerationSuccessScreen';
import { ProofHistoryScreen } from './screens/proving/ProofHistoryScreen';
import { ProofRequestReceiptScreen } from './screens/proving/ProofRequestReceiptScreen';
import { ProofSuccessBackupScreen } from './screens/proving/ProofSuccessBackupScreen';
import { ProvingScreen } from './screens/proving/ProvingScreen';
import { SimpleDialogueScreen } from './screens/proving/SimpleDialogueScreen';
import { VerificationResultScreen } from './screens/proving/VerificationResultScreen';
import { KycMockScreen } from './screens/tunnel/KycMockScreen';
import { TourScreen as TunnelTourScreen } from './screens/tunnel/TourScreen';
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
          <Route path="/onboarding/tour/:step" element={<TourScreen />} />
          <Route path="/onboarding/country" element={<CountryPickerScreen />} />
          <Route path="/onboarding/id-type" element={<IDSelectionScreen />} />
          <Route path="/onboarding/provider" element={<ProviderLaunchScreen />} />
          <Route path="/onboarding/provider-result" element={<ProviderResultScreen />} />
          <Route path="/onboarding/confirm" element={<ConfirmIdentificationScreen />} />
          <Route path="/onboarding/success" element={<ScanSuccessScreen />} />
          <Route path="/onboarding/failure" element={<RegistrationFailureScreen />} />
          <Route path="/onboarding/kyc-failure" element={<KycFailureScreen />} />
          <Route path="/proving" element={<ProvingScreen />} />
          <Route path="/proving/result" element={<VerificationResultScreen />} />
          <Route path="/settings" element={<SettingsScreen />} />
          <Route path="/settings/security" element={<SecurityScreen />} />
          <Route path="/settings/notifications" element={<NotificationPreferencesScreen />} />
          <Route path="/settings/dev-mode" element={<DevModeScreen />} />
          {import.meta.env.DEV && <Route path="/debug/keychain" element={<KeychainDebugScreen />} />}
          <Route path="/proving/receipt" element={<ProofRequestReceiptScreen />} />
          <Route path="/proving/history" element={<ProofHistoryScreen />} />
          <Route path="/proving/dialogue" element={<SimpleDialogueScreen />} />
          <Route path="/proving/dialogue-cta" element={<DialogueWithCtaScreen />} />
          <Route path="/proving/generation-dialogue" element={<ProofGenerationDialogueScreen />} />
          <Route path="/proving/generation-success" element={<ProofGenerationSuccessScreen />} />
          <Route path="/proving/backup-prompt" element={<ProofSuccessBackupScreen />} />
          <Route path="/proving/nova" element={<NovaSplashScreen />} />
          <Route path="/proving/kyc-pending" element={<KycPendingScreen />} />
          <Route path="/proving/kyc-success" element={<KycVerificationSuccessScreen />} />
          <Route path="/account/verified" element={<VerificationResultScreen />} />
          <Route path="/coming-soon" element={<ComingSoonScreen />} />
          <Route path="/tunnel/tour/:step" element={<TunnelTourScreen />} />
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
