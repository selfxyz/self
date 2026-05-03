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
  selfApp: SelfApp;
}

const DesktopQRcode = memo(({ proofStep, qrValue, size, selfApp }: DesktopQRcodeProps) => (
  <div style={desktopCardStyle()} role="img" aria-label="Self authentication QR code">
    <DesktopHeader appName={selfApp.appName} appLogo={selfApp.logoBase64} />
    <div style={desktopQrSectionStyle()}>
      <div style={desktopQrWrapperStyle(proofStep)}>
        <QRCode value={qrValue} size={size} proofStep={proofStep} />
      </div>
    </div>
    <DesktopFooter proofStep={proofStep} />
  </div>
));

export default DesktopQRcode;
