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
