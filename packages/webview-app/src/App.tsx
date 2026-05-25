// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import type React from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';

import { InitialRouteRedirect } from './components/InitialRouteRedirect';
import { ModeBoot } from './components/ModeBoot';
import { PasswordGate } from './components/PasswordGate';
import { OperatingModeProvider } from './providers/OperatingModeProvider';
import { SelfClientProvider } from './providers/SelfClientProvider';
import { VerificationRequestProvider } from './providers/VerificationRequestProvider';
import { DevModeScreen } from './screens/account/DevModeScreen';
import { NotificationPreferencesScreen } from './screens/account/NotificationPreferencesScreen';
import { SecurityScreen } from './screens/account/SecurityScreen';
import { SettingsScreen } from './screens/account/SettingsScreen';
import { ComingSoonScreen } from './screens/ComingSoonScreen';
import { KeychainDebugScreen } from './screens/debug/KeychainDebugScreen';
import { HomeScreen } from './screens/home/HomeScreen';
import { IDDataScreen } from './screens/home/IDDataScreen';
import { ManageDocumentsScreen } from './screens/home/ManageDocumentsScreen';
import { ConfirmIdentificationScreen } from './screens/onboarding/ConfirmIdentificationScreen';
import { ConflictDetectedScreen } from './screens/onboarding/ConflictDetectedScreen';
import { CountryPickerScreen } from './screens/onboarding/CountryPickerScreen';
import { IDSelectionScreen } from './screens/onboarding/IDSelectionScreen';
import { KycFailureScreen } from './screens/onboarding/KycFailureScreen';
import {
  AadhaarAppInstructionsRoute,
  AadhaarUploadErrorRoute,
  AadhaarUploadSuccessRoute,
} from './screens/onboarding/aadhaar';
import {
  EuIdBackInstructionsRoute,
  EuIdCanInstructionsRoute,
  EuIdInstructionsRoute,
  EuIdNfcErrorRoute,
  EuIdNfcInstructionsRoute,
  EuIdNfcSuccessRoute,
  EuIdViewfinderRoute,
} from './screens/onboarding/eu-id';
import {
  PassportCodeScanInstructionsRoute,
  PassportCodeScanViewfinderRoute,
  PassportInstructionsRoute,
  PassportNfcErrorRoute,
  PassportNfcRoute,
  PassportNfcSuccessRoute,
} from './screens/onboarding/passport';
import { ProviderLaunchScreen } from './screens/onboarding/ProviderLaunchScreen';
import { ProviderResultScreen } from './screens/onboarding/ProviderResultScreen';
import { PushNotificationPromptScreen } from './screens/onboarding/PushNotificationPromptScreen';
import { RegisteringScreen } from './screens/onboarding/RegisteringScreen';
import { RegistrationFailureScreen } from './screens/onboarding/RegistrationFailureScreen';
import { ScanSuccessScreen } from './screens/onboarding/ScanSuccessScreen';
import { SocialSignOnMethodPickerScreen } from './screens/onboarding/SocialSignOnMethodPickerScreen';
import { SocialSignOnPickerScreen } from './screens/onboarding/SocialSignOnPickerScreen';
import { TourScreen } from './screens/onboarding/TourScreen';
import { InviteScreen } from './screens/points/InviteScreen';
import { PointsScreen } from './screens/points/PointsScreen';
import { DiscloseResultScreen } from './screens/proving/DiscloseResultScreen';
import { KycPendingScreen } from './screens/proving/KycPendingScreen';
import { KycSuccessScreen } from './screens/proving/KycSuccessScreen';
import { ProofGenerationRouteScreen } from './screens/proving/ProofGenerationRouteScreen';
import { ProofGenerationSuccessScreen } from './screens/proving/ProofGenerationSuccessScreen';
import { ProofHistoryScreen } from './screens/proving/ProofHistoryScreen';
import { ProofRequestReceiptScreen } from './screens/proving/ProofRequestReceiptScreen';
import { ProofSuccessBackupScreen } from './screens/proving/ProofSuccessBackupScreen';
import { ProvingScreen } from './screens/proving/ProvingScreen';
import { QRViewfinderScreen } from './screens/proving/QRViewfinderScreen';
import { VerificationResultScreen } from './screens/proving/VerificationResultScreen';
import { BackupMethodPickerScreen } from './screens/recovery/BackupMethodPickerScreen';
import { LaunchRecoveryScreen } from './screens/recovery/LaunchRecoveryScreen';
import { RecoveryFailureScreen } from './screens/recovery/RecoveryFailureScreen';
import { OnboardingRecoveryPhraseScreen, RecoveryPhraseScreen } from './screens/recovery/RecoveryPhraseScreen';
import { RecoverySuccessScreen } from './screens/recovery/RecoverySuccessScreen';
import { SecretPhraseInputScreen } from './screens/recovery/SecretPhraseInputScreen';
import { TourScreen as EmbedTourScreen } from './screens/embed/TourScreen';
import { EmbedDiscloseScreen } from './screens/embed/EmbedDiscloseScreen';
import { EmbedKycFailureScreen } from './screens/embed/EmbedKycFailureScreen';
import { EmbedKycPendingScreen } from './screens/embed/EmbedKycPendingScreen';
import { EmbedKycSuccessScreen } from './screens/embed/EmbedKycSuccessScreen';
import { EmbedKycWrapper } from './screens/embed/EmbedKycWrapper';
import { EmbedProofReceiptScreen } from './screens/embed/EmbedProofReceiptScreen';
import { EmbedProvingScreen } from './screens/embed/EmbedProvingScreen';
import { EmbedRecoveryRequiredScreen } from './screens/embed/EmbedRecoveryRequiredScreen';
import { EmbedResultScreen } from './screens/embed/EmbedResultScreen';

export const App: React.FC = () => (
  <PasswordGate>
    <BrowserRouter>
      <OperatingModeProvider>
        <VerificationRequestProvider>
          <SelfClientProvider>
            <ModeBoot />
            <Routes>
            <Route path="/" element={<HomeScreen />} />
            <Route path="/onboarding/tour/:step" element={<TourScreen />} />
            <Route path="/onboarding/country" element={<CountryPickerScreen />} />
            <Route path="/onboarding/id-type" element={<IDSelectionScreen />} />
            <Route path="/onboarding/provider" element={<ProviderLaunchScreen />} />
            <Route path="/onboarding/provider-result" element={<ProviderResultScreen />} />
            <Route path="/onboarding/confirm" element={<ConfirmIdentificationScreen />} />
            <Route path="/onboarding/passport/instructions" element={<PassportInstructionsRoute />} />
            <Route path="/onboarding/passport/code-scan-instructions" element={<PassportCodeScanInstructionsRoute />} />
            <Route path="/onboarding/passport/code-scan-viewfinder" element={<PassportCodeScanViewfinderRoute />} />
            <Route path="/onboarding/passport/nfc" element={<PassportNfcRoute />} />
            <Route path="/onboarding/passport/nfc-success" element={<PassportNfcSuccessRoute />} />
            <Route path="/onboarding/passport/nfc-error" element={<PassportNfcErrorRoute />} />
            <Route path="/onboarding/eu-id/instructions" element={<EuIdInstructionsRoute />} />
            <Route path="/onboarding/eu-id/back-instructions" element={<EuIdBackInstructionsRoute />} />
            <Route path="/onboarding/eu-id/can-instructions" element={<EuIdCanInstructionsRoute />} />
            <Route path="/onboarding/eu-id/code-scan-viewfinder" element={<EuIdViewfinderRoute />} />
            <Route path="/onboarding/eu-id/nfc-instructions" element={<EuIdNfcInstructionsRoute />} />
            <Route path="/onboarding/eu-id/nfc-success" element={<EuIdNfcSuccessRoute />} />
            <Route path="/onboarding/eu-id/nfc-error" element={<EuIdNfcErrorRoute />} />
            <Route path="/onboarding/aadhaar/instructions" element={<AadhaarAppInstructionsRoute />} />
            <Route path="/onboarding/aadhaar/upload-success" element={<AadhaarUploadSuccessRoute />} />
            <Route path="/onboarding/aadhaar/upload-error" element={<AadhaarUploadErrorRoute />} />
            <Route path="/onboarding/registering" element={<RegisteringScreen />} />
            <Route path="/onboarding/success" element={<ScanSuccessScreen />} />
            <Route path="/onboarding/recovery-phrase" element={<OnboardingRecoveryPhraseScreen />} />
            <Route path="/onboarding/failure" element={<RegistrationFailureScreen />} />
            <Route path="/onboarding/kyc-failure" element={<KycFailureScreen />} />
            <Route path="/proving" element={<ProvingScreen />} />
            <Route path="/proving/qr-scan" element={<QRViewfinderScreen />} />
            <Route path="/points" element={<PointsScreen />} />
            <Route path="/points/invite" element={<InviteScreen />} />
            <Route path="/proving/generating" element={<ProofGenerationRouteScreen />} />
            <Route path="/proving/result" element={<DiscloseResultScreen />} />
            <Route path="/settings" element={<SettingsScreen />} />
            <Route path="/settings/security" element={<SecurityScreen />} />
            <Route path="/settings/notifications" element={<NotificationPreferencesScreen />} />
            <Route path="/settings/dev-mode" element={<DevModeScreen />} />
            {import.meta.env.DEV && <Route path="/dev/keychain" element={<KeychainDebugScreen />} />}
            <Route path="/settings/backup" element={<BackupMethodPickerScreen />} />
            <Route path="/settings/recovery-phrase" element={<RecoveryPhraseScreen />} />
            <Route path="/recovery" element={<LaunchRecoveryScreen />} />
            <Route path="/recovery/phrase-input" element={<SecretPhraseInputScreen />} />
            <Route path="/recovery/failure" element={<RecoveryFailureScreen />} />
            <Route path="/recovery/success" element={<RecoverySuccessScreen />} />
            <Route path="/onboarding/backup" element={<SocialSignOnMethodPickerScreen />} />
            <Route path="/onboarding/signin" element={<SocialSignOnPickerScreen />} />
            <Route path="/onboarding/conflict" element={<ConflictDetectedScreen />} />
            <Route path="/onboarding/notifications" element={<PushNotificationPromptScreen />} />
            <Route path="/proving/receipt" element={<ProofRequestReceiptScreen />} />
            <Route path="/proving/history" element={<ProofHistoryScreen />} />
            <Route path="/proving/generation-success" element={<ProofGenerationSuccessScreen />} />
            <Route path="/proving/backup-prompt" element={<ProofSuccessBackupScreen />} />
            <Route path="/proving/kyc-pending" element={<KycPendingScreen />} />
            <Route path="/proving/kyc-success" element={<KycSuccessScreen />} />
            <Route path="/account/verified" element={<VerificationResultScreen />} />
            <Route path="/id-data" element={<IDDataScreen />} />
            <Route path="/manage-documents" element={<ManageDocumentsScreen />} />
            <Route path="/coming-soon" element={<ComingSoonScreen />} />
            <Route path="/tunnel/tour/:step" element={<EmbedTourScreen />} />
            <Route path="/tunnel/kyc" element={<EmbedKycWrapper />} />
            {import.meta.env.DEV && <Route path="/tunnel/kyc-pending" element={<EmbedKycPendingScreen />} />}
            <Route path="/tunnel/kyc-failure" element={<EmbedKycFailureScreen />} />
            <Route path="/tunnel/kyc-success" element={<EmbedKycSuccessScreen />} />
            <Route path="/tunnel/proof/receipt" element={<EmbedProofReceiptScreen />} />
            <Route path="/tunnel/proof/generating" element={<EmbedProvingScreen />} />
            <Route path="/tunnel/recovery-required" element={<EmbedRecoveryRequiredScreen />} />
            <Route path="/tunnel/proof/disclose" element={<EmbedDiscloseScreen />} />
            <Route path="/tunnel/proof/result" element={<EmbedResultScreen />} />
            <Route path="*" element={<InitialRouteRedirect />} />
          </Routes>
        </SelfClientProvider>
        </VerificationRequestProvider>
      </OperatingModeProvider>
    </BrowserRouter>
  </PasswordGate>
);
