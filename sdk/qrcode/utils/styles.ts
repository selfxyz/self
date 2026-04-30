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

export const desktopAppLogoStyle = (): React.CSSProperties => ({
  width: '32px',
  height: '32px',
  borderRadius: '3px',
  objectFit: 'contain',
});

export const desktopCardStyle = (): React.CSSProperties => baseCardStyle();

export const desktopDescriptionStyle = (): React.CSSProperties => ({
  fontSize: '16px',
  lineHeight: 'normal',
  color: '#000000',
  textAlign: 'center',
  margin: 0,
});

const getDesktopBorderColor = (step: number): string => {
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
      return '#00FFB6';
    default:
      return '#E2E8F0';
  }
};

const baseCardStyle = (): React.CSSProperties => ({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  border: '1px solid #E2E8F0',
  borderRadius: '10px',
  backgroundColor: '#FFFFFF',
  overflow: 'hidden',
  width: '373px',
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
});

export const desktopFooterStyle = (): React.CSSProperties => ({
  display: 'flex',
  flexDirection: 'column',
  gap: '6px',
  width: '100%',
  padding: '20px',
  borderTop: '1px solid #E2E8F0',
  boxSizing: 'border-box',
});

export const desktopHeaderStyle = (): React.CSSProperties => ({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: '10px',
  paddingTop: '26px',
  paddingLeft: '20px',
  paddingRight: '20px',
  width: '100%',
  boxSizing: 'border-box',
});

export const desktopLogoRowStyle = (): React.CSSProperties => ({
  display: 'flex',
  alignItems: 'center',
  gap: '10px',
});

export const desktopQrSectionStyle = (): React.CSSProperties => ({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '20px 10px',
  width: '100%',
  boxSizing: 'border-box',
});

export const desktopQrWrapperStyle = (step: number): React.CSSProperties => ({
  display: 'inline-flex',
  flexDirection: 'column',
  alignItems: 'center',
  padding: '10px',
  borderRadius: '10px',
  border: `6px solid ${getDesktopBorderColor(step)}`,
  backgroundColor: '#FFF',
  transition: 'border-color 0.3s ease',
});

export const desktopSelfLogoContainerStyle = (): React.CSSProperties => ({
  width: '32px',
  height: '32px',
  borderRadius: '3px',
  backgroundColor: '#000000',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  overflow: 'hidden',
});

export const desktopSelfLogoImgStyle = (): React.CSSProperties => ({
  width: '20px',
  height: '20px',
});

export const desktopStatusCardStyle = (): React.CSSProperties => ({
  backgroundColor: '#F8FAFC',
  borderRadius: '5px',
  padding: '6px 10px',
  width: '100%',
  boxSizing: 'border-box',
});

export const desktopStatusContentStyle = (): React.CSSProperties => ({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: '10px',
  padding: '8px 0',
});

export const desktopStatusFooterStyle = (): React.CSSProperties => ({
  display: 'flex',
  flexDirection: 'column',
  width: '100%',
  padding: '20px',
  borderTop: '1px solid #E2E8F0',
  boxSizing: 'border-box',
});

export const desktopStatusIconStyle = (): React.CSSProperties => ({
  width: '34px',
  height: '34px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
});

export const desktopStatusSubtitleStyle = (): React.CSSProperties => ({
  fontSize: '14px',
  color: '#94A3B8',
  margin: 0,
});

export const desktopStatusTextStyle = (): React.CSSProperties => ({
  display: 'flex',
  flexDirection: 'column',
  gap: '6px',
  alignItems: 'center',
  width: '100%',
  textAlign: 'center',
});

export const desktopStatusTitleStyle = (): React.CSSProperties => ({
  fontSize: '18px',
  fontWeight: 500,
  color: '#000000',
  margin: 0,
});

export const desktopStepIconStyle = (): React.CSSProperties => ({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: '26px',
  height: '26px',
  flexShrink: 0,
});

export const desktopStepInnerStyle = (): React.CSSProperties => ({
  display: 'flex',
  alignItems: 'center',
  gap: '10px',
  padding: '8px 0',
  width: '100%',
});

export const desktopStepStyle = (): React.CSSProperties => ({
  backgroundColor: '#F8FAFC',
  borderRadius: '5px',
  padding: '6px 10px',
  width: '100%',
  boxSizing: 'border-box',
});

export const desktopStepTextStyle = (): React.CSSProperties => ({
  fontSize: '14px',
  lineHeight: 'normal',
  color: '#0F172A',
});

// Mobile variant styles
export const mobileCardStyle = (): React.CSSProperties => baseCardStyle();


export const mobileCtaButtonStyle = (): React.CSSProperties => ({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '10px',
  width: '100%',
  padding: '10px 0 14px',
  backgroundColor: '#000000',
  borderRadius: '5px',
  border: 'none',
  cursor: 'pointer',
  textDecoration: 'none',
});


export const mobileCtaLogoStyle = (): React.CSSProperties => ({
  width: '26px',
  height: '26px',
});



export const mobileCtaSectionStyle = (): React.CSSProperties => ({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  padding: '16px 20px',
  width: '100%',
  borderTop: '1px solid #E2E8F0',
  boxSizing: 'border-box',
});

export const mobileCtaTextStyle = (): React.CSSProperties => ({
  fontSize: '18px',
  fontWeight: 700,
  lineHeight: 'normal',
  color: '#FFFFFF',
  textAlign: 'center',
});

export const mobileFooterStyle = (): React.CSSProperties => ({
  display: 'flex',
  flexDirection: 'column',
  gap: '6px',
  width: '100%',
  padding: '16px 20px 20px',
  boxSizing: 'border-box',
});

export const mobilePhoneImgStyle = (): React.CSSProperties => ({
  width: '185px',
  height: 'auto',
  display: 'block',
  margin: '0 auto',
  position: 'relative',
  top: '15px',
});

export const mobilePhoneSectionStyle = (): React.CSSProperties => ({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'flex-end',
  backgroundColor: '#2563EB',
  borderRadius: '10px',
  width: '100%',
  height: '202px',
  overflow: 'hidden',
  position: 'relative',
  boxSizing: 'border-box',
});

export const mobilePhoneSectionWrapperStyle = (): React.CSSProperties => ({
  padding: '20px 20px 0',
  width: '100%',
  boxSizing: 'border-box',
});

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

// Hybrid variant styles

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
