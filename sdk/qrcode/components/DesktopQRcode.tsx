import type { SelfApp } from '@selfxyz/sdk-common';
import React, { memo } from 'react';

import { desktopCardStyle, desktopQrSectionStyle, desktopQrWrapperStyle } from '../utils/styles.js';
import DesktopFooter from './DesktopFooter.js';
import DesktopHeader from './DesktopHeader.js';
import QRCode from './QRCode.js';

interface DesktopQRcodeProps {
  proofStep: number;
  qrValue: string;
  size: number;
  darkMode: boolean;
  selfApp: SelfApp;
}

const DesktopQRcode = memo(
  ({ proofStep, qrValue, size, darkMode, selfApp }: DesktopQRcodeProps) => (
    <div style={desktopCardStyle(darkMode)} role="img" aria-label="Self authentication QR code">
      <DesktopHeader appName={selfApp.appName} appLogo={selfApp.logoBase64} darkMode={darkMode} />
      <div style={desktopQrSectionStyle()}>
        <div style={desktopQrWrapperStyle(proofStep, darkMode)}>
          <QRCode value={qrValue} size={size} darkMode={darkMode} proofStep={proofStep} />
        </div>
      </div>
      <DesktopFooter proofStep={proofStep} darkMode={darkMode} />
    </div>
  )
);

export default DesktopQRcode;
