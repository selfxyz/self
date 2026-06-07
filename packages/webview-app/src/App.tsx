// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import type React from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';

import { BootDecision } from './components/BootDecision';
import { InitialRouteRedirect } from './components/InitialRouteRedirect';
import { ModeDispatch } from './components/modeDispatch';
import { ModeRoute } from './components/ModeRoute';
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
import { EmbedDiscloseScreen } from './screens/embed/EmbedDiscloseScreen';
import { EmbedErrorScreen } from './screens/embed/EmbedErrorScreen';
import { EmbedKycFailureScreen } from './screens/embed/EmbedKycFailureScreen';
import { EmbedKycPendingScreen } from './screens/embed/EmbedKycPendingScreen';
import { EmbedKycSuccessScreen } from './screens/embed/EmbedKycSuccessScreen';
import { EmbedKycWrapper } from './screens/embed/EmbedKycWrapper';
import { EmbedProofReceiptScreen } from './screens/embed/EmbedProofReceiptScreen';
import { EmbedProvingScreen } from './screens/embed/EmbedProvingScreen';
import { EmbedRecoveryRequiredScreen } from './screens/embed/EmbedRecoveryRequiredScreen';
import { EmbedResultScreen } from './screens/embed/EmbedResultScreen';
import { TourScreen as EmbedTourScreen } from './screens/embed/TourScreen';
import { HomeScreen } from './screens/home/HomeScreen';
import { IDDataScreen } from './screens/home/IDDataScreen';
import { ManageDocumentsScreen } from './screens/home/ManageDocumentsScreen';
import {
  AadhaarAppInstructionsRoute,
  AadhaarUploadErrorRoute,
  AadhaarUploadSuccessRoute,
} from './screens/onboarding/aadhaar';
import { ConfirmIdentificationScreen } from './screens/onboarding/ConfirmIdentificationScreen';
import { ConflictDetectedScreen } from './screens/onboarding/ConflictDetectedScreen';
import { CountryPickerScreen } from './screens/onboarding/CountryPickerScreen';
import {
  EuIdBackInstructionsRoute,
  EuIdCanInstructionsRoute,
  EuIdInstructionsRoute,
  EuIdNfcErrorRoute,
  EuIdNfcInstructionsRoute,
  EuIdNfcSuccessRoute,
  EuIdViewfinderRoute,
} from './screens/onboarding/eu-id';
import { IDSelectionScreen } from './screens/onboarding/IDSelectionScreen';
import { KycFailureScreen } from './screens/onboarding/KycFailureScreen';
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

export const AppRoutes: React.FC = () => (
  <OperatingModeProvider>
    <VerificationRequestProvider>
      <SelfClientProvider>
        <BootDecision />
            <Routes>
              {ModeRoute({ mode: 'self-app', path: '/', element: <HomeScreen /> })}

              {ModeRoute({
                mode: 'shared',
                path: '/tour/:step',
                element: <ModeDispatch selfApp={TourScreen} embed={EmbedTourScreen} />,
              })}
              {ModeRoute({ mode: 'shared', path: '/pick-country', element: <CountryPickerScreen /> })}
              {ModeRoute({ mode: 'shared', path: '/pick-id-type', element: <IDSelectionScreen /> })}
              {ModeRoute({ mode: 'shared', path: '/pick-provider', element: <ProviderLaunchScreen /> })}
              {ModeRoute({ mode: 'shared', path: '/capture/provider-result', element: <ProviderResultScreen /> })}
              {ModeRoute({ mode: 'shared', path: '/capture/confirm', element: <ConfirmIdentificationScreen /> })}
              {ModeRoute({ mode: 'embed', path: '/capture/kyc', element: <EmbedKycWrapper /> })}

              {ModeRoute({
                mode: 'shared',
                path: '/capture/passport/instructions',
                element: <PassportInstructionsRoute />,
              })}
              {ModeRoute({
                mode: 'shared',
                path: '/capture/passport/code-scan-instructions',
                element: <PassportCodeScanInstructionsRoute />,
              })}
              {ModeRoute({
                mode: 'shared',
                path: '/capture/passport/code-scan-viewfinder',
                element: <PassportCodeScanViewfinderRoute />,
              })}
              {ModeRoute({
                mode: 'shared',
                path: '/capture/passport/nfc',
                element: <PassportNfcRoute />,
              })}
              {ModeRoute({
                mode: 'shared',
                path: '/capture/passport/nfc-success',
                element: <PassportNfcSuccessRoute />,
              })}
              {ModeRoute({
                mode: 'shared',
                path: '/capture/passport/nfc-error',
                element: <PassportNfcErrorRoute />,
              })}

              {ModeRoute({
                mode: 'shared',
                path: '/capture/eu-id/instructions',
                element: <EuIdInstructionsRoute />,
              })}
              {ModeRoute({
                mode: 'shared',
                path: '/capture/eu-id/back-instructions',
                element: <EuIdBackInstructionsRoute />,
              })}
              {ModeRoute({
                mode: 'shared',
                path: '/capture/eu-id/can-instructions',
                element: <EuIdCanInstructionsRoute />,
              })}
              {ModeRoute({
                mode: 'shared',
                path: '/capture/eu-id/code-scan-viewfinder',
                element: <EuIdViewfinderRoute />,
              })}
              {ModeRoute({
                mode: 'shared',
                path: '/capture/eu-id/nfc-instructions',
                element: <EuIdNfcInstructionsRoute />,
              })}
              {ModeRoute({
                mode: 'shared',
                path: '/capture/eu-id/nfc-success',
                element: <EuIdNfcSuccessRoute />,
              })}
              {ModeRoute({
                mode: 'shared',
                path: '/capture/eu-id/nfc-error',
                element: <EuIdNfcErrorRoute />,
              })}

              {ModeRoute({
                mode: 'shared',
                path: '/capture/aadhaar/instructions',
                element: <AadhaarAppInstructionsRoute />,
              })}
              {ModeRoute({
                mode: 'shared',
                path: '/capture/aadhaar/upload-success',
                element: <AadhaarUploadSuccessRoute />,
              })}
              {ModeRoute({
                mode: 'shared',
                path: '/capture/aadhaar/upload-error',
                element: <AadhaarUploadErrorRoute />,
              })}

              {ModeRoute({ mode: 'shared', path: '/capture/success', element: <ScanSuccessScreen /> })}
              {ModeRoute({ mode: 'shared', path: '/register/generating', element: <RegisteringScreen /> })}
              {ModeRoute({ mode: 'self-app', path: '/register/success', element: <ProofSuccessBackupScreen /> })}
              {ModeRoute({ mode: 'shared', path: '/register/failure', element: <RegistrationFailureScreen /> })}

              {ModeRoute({ mode: 'self-app', path: '/backup-phrase', element: <OnboardingRecoveryPhraseScreen /> })}
              {ModeRoute({ mode: 'self-app', path: '/notify', element: <PushNotificationPromptScreen /> })}

              {ModeRoute({
                mode: 'shared',
                path: '/disclose/request',
                element: <ModeDispatch selfApp={ProvingScreen} embed={EmbedDiscloseScreen} />,
              })}
              {ModeRoute({ mode: 'shared', path: '/disclose/qr-scan', element: <QRViewfinderScreen /> })}
              {ModeRoute({
                mode: 'shared',
                path: '/disclose/generating',
                element: <ModeDispatch selfApp={ProofGenerationRouteScreen} embed={EmbedProvingScreen} />,
              })}
              {ModeRoute({
                mode: 'shared',
                path: '/disclose/result',
                element: <ModeDispatch selfApp={DiscloseResultScreen} embed={EmbedResultScreen} />,
              })}
              {ModeRoute({
                mode: 'shared',
                path: '/disclose/kyc-failure',
                element: <ModeDispatch selfApp={KycFailureScreen} embed={EmbedKycFailureScreen} />,
              })}
              {ModeRoute({
                mode: 'shared',
                path: '/disclose/kyc-success',
                element: <ModeDispatch selfApp={KycSuccessScreen} embed={EmbedKycSuccessScreen} />,
              })}
              {ModeRoute({
                mode: 'shared',
                path: '/disclose/kyc-pending',
                element: import.meta.env.DEV ? (
                  <ModeDispatch selfApp={KycPendingScreen} embed={EmbedKycPendingScreen} />
                ) : (
                  <KycPendingScreen />
                ),
              })}

              {ModeRoute({ mode: 'self-app', path: '/history', element: <ProofHistoryScreen /> })}
              {ModeRoute({
                mode: 'shared',
                path: '/receipts/:id',
                element: <ModeDispatch selfApp={ProofRequestReceiptScreen} embed={EmbedProofReceiptScreen} />,
              })}

              {ModeRoute({ mode: 'self-app', path: '/account/verified', element: <VerificationResultScreen /> })}
              {ModeRoute({ mode: 'self-app', path: '/points', element: <PointsScreen /> })}
              {ModeRoute({ mode: 'self-app', path: '/points/invite', element: <InviteScreen /> })}
              {ModeRoute({ mode: 'self-app', path: '/docs', element: <ManageDocumentsScreen /> })}
              {ModeRoute({ mode: 'self-app', path: '/docs/:id', element: <IDDataScreen /> })}

              {ModeRoute({ mode: 'self-app', path: '/settings', element: <SettingsScreen /> })}
              {ModeRoute({ mode: 'self-app', path: '/settings/security', element: <SecurityScreen /> })}
              {ModeRoute({
                mode: 'self-app',
                path: '/settings/notifications',
                element: <NotificationPreferencesScreen />,
              })}
              {ModeRoute({ mode: 'self-app', path: '/settings/dev-mode', element: <DevModeScreen /> })}
              {ModeRoute({ mode: 'self-app', path: '/settings/backup', element: <BackupMethodPickerScreen /> })}
              {ModeRoute({
                mode: 'self-app',
                path: '/settings/recovery-phrase',
                element: <RecoveryPhraseScreen />,
              })}

              {ModeRoute({ mode: 'self-app', path: '/recover', element: <LaunchRecoveryScreen /> })}
              {ModeRoute({ mode: 'self-app', path: '/recover/phrase-input', element: <SecretPhraseInputScreen /> })}
              {ModeRoute({ mode: 'self-app', path: '/recover/failure', element: <RecoveryFailureScreen /> })}
              {ModeRoute({ mode: 'self-app', path: '/recover/success', element: <RecoverySuccessScreen /> })}
              {ModeRoute({ mode: 'embed', path: '/recover/required', element: <EmbedRecoveryRequiredScreen /> })}

              {ModeRoute({
                mode: 'self-app',
                path: '/onboarding/backup',
                element: <SocialSignOnMethodPickerScreen />,
              })}
              {ModeRoute({
                mode: 'self-app',
                path: '/onboarding/signin',
                element: <SocialSignOnPickerScreen />,
              })}
              {ModeRoute({
                mode: 'self-app',
                path: '/onboarding/conflict',
                element: <ConflictDetectedScreen />,
              })}

              {ModeRoute({ mode: 'shared', path: '/coming-soon', element: <ComingSoonScreen /> })}
              {ModeRoute({ mode: 'embed', path: '/embed/error', element: <EmbedErrorScreen /> })}
              {import.meta.env.DEV && <Route path="/dev/keychain" element={<KeychainDebugScreen />} />}

              <Route path="*" element={<InitialRouteRedirect />} />
            </Routes>
      </SelfClientProvider>
    </VerificationRequestProvider>
  </OperatingModeProvider>
);

const defaultRouter = (children: React.ReactNode): React.ReactNode => <BrowserRouter>{children}</BrowserRouter>;

export interface AppProps {
  // Router seam: production wraps the route table in BrowserRouter; tests pass a
  // MemoryRouter wrapper to mount the real route table at a chosen entry.
  renderRouter?: (children: React.ReactNode) => React.ReactNode;
}

export const App: React.FC<AppProps> = ({ renderRouter = defaultRouter }) => (
  <PasswordGate>{renderRouter(<AppRoutes />)}</PasswordGate>
);
