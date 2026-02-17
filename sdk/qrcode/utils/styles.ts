import React from 'react';

import { QRcodeSteps } from './utils.js';

const getBorderColor = (step: number): string => {
  switch (step) {
    case QRcodeSteps.DISCONNECTED:
    case QRcodeSteps.WAITING_FOR_MOBILE:
      return '#E2E8F0';
    case QRcodeSteps.MOBILE_CONNECTED:
    case QRcodeSteps.PROOF_GENERATION_STARTED:
    case QRcodeSteps.PROOF_GENERATED:
      return '#3B82F6';
    case QRcodeSteps.PROOF_GENERATION_FAILED:
      return '#EF4444';
    case QRcodeSteps.PROOF_VERIFIED:
      return '#01BFFF';
    default:
      return '#E2E8F0';
  }
};

export const qrAnimationOverlayStyle = (imageSize: number): React.CSSProperties => ({
  position: 'absolute',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  width: imageSize,
  height: imageSize,
  pointerEvents: 'none',
});

export const qrContainerStyle = (size: number): React.CSSProperties => ({
  position: 'relative',
  width: size,
  height: size,
});

export const qrWrapperStyle = (step: number, showBorder: boolean = true): React.CSSProperties => ({
  display: 'inline-flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: '6px',
  padding: '3px',
  borderRadius: '10px',
  border: showBorder ? `6px solid ${getBorderColor(step)}` : 'none',
  backgroundColor: '#FFF',
  transition: 'border-color 0.3s ease',
});

export const statusBannerLogoStyle: React.CSSProperties = {
  width: 28,
  height: 28,
  marginRight: 8,
};

export const statusBannerStyle = (qrSize: number): React.CSSProperties => ({
  backgroundColor: '#000',
  color: '#fff',
  borderRadius: '5px',
  width: qrSize,
  fontWeight: '700',
  fontSize: '18px',
  height: '50px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
});
