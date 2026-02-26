import React from 'react';

import dotsIcon from '../assets/3dots.png';
import errorIcon from '../assets/error.png';
import qrcodeIcon from '../assets/qrcode.png';
import shieldcheckIcon from '../assets/shieldcheck.png';
import shieldcheck2Icon from '../assets/shieldcheck2.png';
import shieldlightningIcon from '../assets/shieldlightning.png';
import squarecheckIcon from '../assets/squarecheck.png';
import warningIcon from '../assets/warning.png';

interface IconProps {
  size?: number;
}

export const DotsIcon = ({ size = 18 }: IconProps) => (
  <img src={dotsIcon} alt="" width={size} height={size} style={{ display: 'block' }} />
);

export const ScanIcon = ({ size = 24 }: IconProps) => (
  <img src={qrcodeIcon} alt="" width={size} height={size} style={{ display: 'block' }} />
);

export const SelfShieldIcon = ({ size = 24 }: IconProps) => (
  <img src={shieldcheckIcon} alt="" width={size} height={size} style={{ display: 'block' }} />
);

export const ReturnIcon = ({ size = 24 }: IconProps) => (
  <img src={squarecheckIcon} alt="" width={size} height={size} style={{ display: 'block' }} />
);

export const BoltIcon = ({ size = 24 }: IconProps) => (
  <img src={shieldlightningIcon} alt="" width={size} height={size} style={{ display: 'block' }} />
);

export const CheckIcon = ({ size = 24 }: IconProps) => (
  <img src={shieldcheck2Icon} alt="" width={size} height={size} style={{ display: 'block' }} />
);

export const ExclamationIcon = ({ size = 24 }: IconProps) => (
  <img src={errorIcon} alt="" width={size} height={size} style={{ display: 'block' }} />
);

export const WarningIcon = ({ size = 24 }: IconProps) => (
  <img src={warningIcon} alt="" width={size} height={size} style={{ display: 'block' }} />
);

export const DownloadIcon = ({ size = 24 }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={{ display: 'block' }}>
    <path
      d="M12 3v12m0 0l-4-4m4 4l4-4M4 17v2a2 2 0 002 2h12a2 2 0 002-2v-2"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export const VerifyIcon = ({ size = 24 }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={{ display: 'block' }}>
    <path
      d="M12 2L3 7v5c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-9-5zm-1 14.59l-3.29-3.3 1.41-1.41L11 13.76l4.88-4.88 1.41 1.41L11 16.59z"
      fill="currentColor"
    />
  </svg>
);

export const ArrowReturnIcon = ({ size = 24 }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={{ display: 'block' }}>
    <path
      d="M9 15l-5-5 5-5M4 10h11a5 5 0 010 10h-3"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);
