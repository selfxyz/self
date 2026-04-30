import { statusConnecting, statusError, statusFailed, statusSuccess } from '../animations/index.js';
import selfLogoBlack from '../assets/self-logo-qr.svg';

export const QRcodeSteps = {
  DISCONNECTED: 0,
  WAITING_FOR_MOBILE: 1,
  MOBILE_CONNECTED: 2,
  PROOF_GENERATION_STARTED: 3,
  PROOF_GENERATION_FAILED: 4,
  PROOF_GENERATED: 5,
  PROOF_VERIFIED: 6,
};

export const getDesktopDescription = (appName: string): string =>
  `${appName} uses Self to verify identity without compromising your privacy.`;

export const getDesktopStatusSubtitle = (): string => 'Verify the proof using the Self mobile app';

export const getDesktopStatusTitle = (proofStep: number): string => {
  switch (proofStep) {
    case QRcodeSteps.MOBILE_CONNECTED:
    case QRcodeSteps.PROOF_GENERATION_STARTED:
    case QRcodeSteps.PROOF_GENERATED:
      return 'Connecting to Self';
    case QRcodeSteps.PROOF_VERIFIED:
      return 'Proof Verified';
    case QRcodeSteps.PROOF_GENERATION_FAILED:
      return 'Proof Failed';
    default:
      return 'An error occurred';
  }
};

export const getStatusAnimation = (proofStep: number) => {
  switch (proofStep) {
    case QRcodeSteps.MOBILE_CONNECTED:
    case QRcodeSteps.PROOF_GENERATION_STARTED:
    case QRcodeSteps.PROOF_GENERATED:
      return statusConnecting;
    case QRcodeSteps.PROOF_VERIFIED:
      return statusSuccess;
    case QRcodeSteps.PROOF_GENERATION_FAILED:
      return statusFailed;
    default:
      return statusError;
  }
};

export const getStatusIcon = (proofStep: number): string => {
  switch (proofStep) {
    case QRcodeSteps.DISCONNECTED:
    case QRcodeSteps.WAITING_FOR_MOBILE:
      return selfLogoBlack;
    default:
      return '';
  }
};

export const getStatusText = (proofStep: number): string => {
  switch (proofStep) {
    case QRcodeSteps.DISCONNECTED:
    case QRcodeSteps.WAITING_FOR_MOBILE:
      return 'Prove your Self';
    case QRcodeSteps.MOBILE_CONNECTED:
    case QRcodeSteps.PROOF_GENERATION_STARTED:
      return 'Connected to Self';
    case QRcodeSteps.PROOF_GENERATED:
      return 'Proof Generated';
    case QRcodeSteps.PROOF_VERIFIED:
      return 'Proof Successful';
    case QRcodeSteps.PROOF_GENERATION_FAILED:
      return 'Proof Failed';
    default:
      return 'An error occurred';
  }
};
