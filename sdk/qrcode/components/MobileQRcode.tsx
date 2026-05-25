import type { SelfApp } from '@selfxyz/sdk-common';
import React, { memo } from 'react';

import phoneMockup from '../assets/phone-mockup.png';
import selfLogo from '../assets/self-logo.svg';
import {
  desktopStepIconStyle,
  desktopStepInnerStyle,
  desktopStepStyle,
  desktopStepTextStyle,
  mobileCardStyle,
  mobileCtaButtonStyle,
  mobileCtaLogoStyle,
  mobileCtaSectionStyle,
  mobileCtaTextStyle,
  mobileFooterStyle,
  mobilePhoneImgStyle,
  mobilePhoneSectionStyle,
  mobilePhoneSectionWrapperStyle,
} from '../utils/styles.js';
import DesktopHeader from './DesktopHeader.js';
import { ArrowReturnIcon, DownloadIcon, VerifyIcon } from './icons.js';

interface MobileQRcodeProps {
  proofStep: number;
  qrValue: string;
  selfApp: SelfApp;
  darkMode?: boolean;
}

const MOBILE_STEPS = [
  { icon: DownloadIcon, text: 'Download the Self Mobile app' },
  { icon: VerifyIcon, text: 'Verify your identity' },
  { icon: ArrowReturnIcon, text: 'Return to this application and click on the button below' },
];

const MobileQRcode = memo(({ qrValue, selfApp, darkMode = false }: MobileQRcodeProps) => (
  <div style={mobileCardStyle(darkMode)} role="region" aria-label="Self authentication">
    <DesktopHeader appName={selfApp.appName} appLogo={selfApp.logoBase64} darkMode={darkMode} />
    <div style={mobilePhoneSectionWrapperStyle()}>
      <div style={mobilePhoneSectionStyle()}>
        <img src={phoneMockup} alt="Self app preview" style={mobilePhoneImgStyle()} />
      </div>
    </div>
    <div style={mobileFooterStyle()}>
      {MOBILE_STEPS.map((step, index) => {
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
    <div style={mobileCtaSectionStyle(darkMode)}>
      <a href={qrValue} style={mobileCtaButtonStyle()}>
        <img src={selfLogo} alt="" style={mobileCtaLogoStyle()} />
        <span style={mobileCtaTextStyle()}>Open Self app</span>
      </a>
    </div>
  </div>
));

export default MobileQRcode;
