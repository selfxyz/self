import Lottie from 'lottie-react';
import { QRCodeSVG } from 'qrcode.react';
import React, { memo } from 'react';

import { qrAnimationOverlayStyle, qrContainerStyle } from '../utils/styles.js';
import { getStatusAnimation, getStatusIcon, QRcodeSteps } from '../utils/utils.js';

const LottieComponent = Lottie.default || Lottie;
const QR_IMAGE_SIZE_RATIO = 0.32;

interface QRCodeProps {
  value: string;
  size: number;
  darkMode: boolean;
  proofStep: number;
}

const QRCode = memo(({ value, size, darkMode, proofStep }: QRCodeProps) => {
  const isInitialState =
    proofStep === QRcodeSteps.DISCONNECTED || proofStep === QRcodeSteps.WAITING_FOR_MOBILE;

  const isConnectingState =
    proofStep === QRcodeSteps.MOBILE_CONNECTED ||
    proofStep === QRcodeSteps.PROOF_GENERATION_STARTED ||
    proofStep === QRcodeSteps.PROOF_GENERATED;

  const showAnimation = !isInitialState;

  const statusIcon = getStatusIcon(proofStep);
  const bgColor = darkMode ? '#000000' : '#ffffff';
  const fgColor = darkMode ? '#ffffff' : '#000000';
  const imageSize = size * QR_IMAGE_SIZE_RATIO;

  return (
    <div style={qrContainerStyle(size)}>
      <QRCodeSVG
        value={value}
        size={size}
        bgColor={bgColor}
        fgColor={fgColor}
        level="H"
        imageSettings={
          statusIcon
            ? {
                src: statusIcon,
                height: imageSize,
                width: imageSize,
                excavate: true,
              }
            : undefined
        }
      />
      {showAnimation && (
        <div style={qrAnimationOverlayStyle(imageSize)}>
          {/* @ts-expect-error Lottie typings don't match the default export shape */}
          <LottieComponent
            animationData={getStatusAnimation(proofStep)}
            loop={isConnectingState}
            speed={1}
          />
        </div>
      )}
    </div>
  );
});

export default QRCode;
