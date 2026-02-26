import React, { memo } from 'react';

import selfLogo from '../assets/self-logo.svg';
import {
  mobileCtaButtonStyle,
  mobileCtaLogoStyle,
  mobileCtaTextStyle,
} from '../utils/styles.js';

interface SelfDeepLinkButtonProps {
  href: string;
  text?: string;
}

const SelfDeepLinkButton = memo(({ href, text = 'Open Self app' }: SelfDeepLinkButtonProps) => (
  <a href={href} style={mobileCtaButtonStyle()}>
    <img src={selfLogo} alt="" style={mobileCtaLogoStyle()} />
    <span style={mobileCtaTextStyle()}>{text}</span>
  </a>
));

export default SelfDeepLinkButton;
