import React, { memo } from 'react';

import {
  desktopFooterStyle,
  desktopStatusCardStyle,
  desktopStatusContentStyle,
  desktopStatusFooterStyle,
  desktopStatusIconStyle,
  desktopStatusSubtitleStyle,
  desktopStatusTextStyle,
  desktopStatusTitleStyle,
  desktopStepIconStyle,
  desktopStepInnerStyle,
  desktopStepStyle,
  desktopStepTextStyle,
} from '../utils/styles.js';
import { getDesktopStatusSubtitle, getDesktopStatusTitle, QRcodeSteps } from '../utils/utils.js';
import {
  BoltIcon,
  CheckIcon,
  ExclamationIcon,
  ReturnIcon,
  ScanIcon,
  SelfShieldIcon,
  WarningIcon,
} from './icons.js';

interface DesktopFooterProps {
  proofStep: number;
  darkMode?: boolean;
}

const INSTRUCTION_STEPS = [
  { icon: ScanIcon, text: 'Scan this QR code to get the Self app' },
  { icon: SelfShieldIcon, text: 'Verify an identity document in the Self app' },
  { icon: ReturnIcon, text: 'Rescan this QR code and prove your identity' },
];

const getStatusIcon = (proofStep: number) => {
  switch (proofStep) {
    case QRcodeSteps.MOBILE_CONNECTED:
    case QRcodeSteps.PROOF_GENERATION_STARTED:
    case QRcodeSteps.PROOF_GENERATED:
      return BoltIcon;
    case QRcodeSteps.PROOF_VERIFIED:
      return CheckIcon;
    case QRcodeSteps.PROOF_GENERATION_FAILED:
      return ExclamationIcon;
    default:
      return WarningIcon;
  }
};

const DesktopFooter = memo(({ proofStep, darkMode = false }: DesktopFooterProps) => {
  const isInitialState =
    proofStep === QRcodeSteps.DISCONNECTED || proofStep === QRcodeSteps.WAITING_FOR_MOBILE;

  if (isInitialState) {
    return (
      <div style={desktopFooterStyle(darkMode)}>
        {INSTRUCTION_STEPS.map((step, index) => {
          const Icon = step.icon;
          return (
            <div key={index} style={desktopStepStyle(darkMode)}>
              <div style={desktopStepInnerStyle()}>
                <div style={desktopStepIconStyle(darkMode)}>
                  <Icon size={18} />
                </div>
                <span style={desktopStepTextStyle(darkMode)}>{step.text}</span>
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  const StatusIcon = getStatusIcon(proofStep);

  return (
    <div style={desktopStatusFooterStyle(darkMode)}>
      <div style={desktopStatusCardStyle(darkMode)}>
        <div style={desktopStatusContentStyle()}>
          <div style={desktopStatusIconStyle()}>
            <StatusIcon size={34} />
          </div>
          <div style={desktopStatusTextStyle()}>
            <p style={desktopStatusTitleStyle(darkMode)}>{getDesktopStatusTitle(proofStep)}</p>
            <p style={desktopStatusSubtitleStyle()}>{getDesktopStatusSubtitle()}</p>
          </div>
        </div>
      </div>
    </div>
  );
});

export default DesktopFooter;
