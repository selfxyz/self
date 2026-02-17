import React, { memo } from 'react';

import selfLogo from '../assets/self-logo.svg';
import { statusBannerLogoStyle, statusBannerStyle } from '../utils/styles.js';
import { getStatusText, QRcodeSteps } from '../utils/utils.js';

interface StatusBannerProps {
  proofStep: number;
  qrSize: number;
}

const StatusBanner = memo(({ proofStep, qrSize }: StatusBannerProps) => {
  const showLogo =
    proofStep === QRcodeSteps.DISCONNECTED || proofStep === QRcodeSteps.WAITING_FOR_MOBILE;

  return (
    <div style={statusBannerStyle(qrSize)} role="status" aria-live="polite">
      {showLogo && <img src={selfLogo} alt="Self Logo" style={statusBannerLogoStyle} />}
      {getStatusText(proofStep)}
    </div>
  );
});

export default StatusBanner;
