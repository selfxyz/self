import React, { memo } from 'react';

import selfLogo from '../assets/self-logo.svg';
import {
  desktopAppLogoStyle,
  desktopDescriptionStyle,
  desktopHeaderStyle,
  desktopLogoRowStyle,
  desktopSelfLogoContainerStyle,
  desktopSelfLogoImgStyle,
} from '../utils/styles.js';
import { getDesktopDescription } from '../utils/utils.js';
import { DotsIcon } from './icons.js';

interface DesktopHeaderProps {
  appName: string;
  appLogo: string;
}

const DesktopHeader = memo(({ appName, appLogo }: DesktopHeaderProps) => (
  <div style={desktopHeaderStyle()}>
    <div style={desktopLogoRowStyle()}>
      <img src={appLogo} alt={`${appName} logo`} style={desktopAppLogoStyle()} />
      <DotsIcon size={18} />
      <div style={desktopSelfLogoContainerStyle()}>
        <img src={selfLogo} alt="Self logo" style={desktopSelfLogoImgStyle()} />
      </div>
    </div>
    <p style={desktopDescriptionStyle()}>{getDesktopDescription(appName)}</p>
  </div>
));

export default DesktopHeader;
