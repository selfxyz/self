import React, { useEffect, useState } from 'react';
import { OpenPassportAttestation, OpenPassportVerifier } from '@openpassport/core';
import { BounceLoader } from 'react-spinners';
import Lottie from 'lottie-react';
import CHECK_ANIMATION from './animations/check_animation.json';
import X_ANIMATION from './animations/x_animation.json';
import LED from './components/LED';
import { WS_URL } from '../../common/src/constants/constants';
import { UserIdType } from '../../common/src/utils/circuits/uuid';
import { v4 as uuidv4 } from 'uuid';
import { QRcodeSteps } from './utils/utils';
import { containerStyle, ledContainerStyle, qrContainerStyle } from './utils/styles';
import dynamic from 'next/dynamic';
import { initWebSocket } from './utils/websocket';
const QRCodeSVG = dynamic(() => import('qrcode.react').then((mod) => mod.QRCodeSVG), {
  ssr: false,
});

interface OpenPassportQRcodeProps {
  appName: string;
  userId: string;
  userIdType: UserIdType;
  openPassportVerifier: OpenPassportVerifier;
  onSuccess: (attestation: OpenPassportAttestation) => void;
  websocketUrl?: string;
  size?: number;
}

// Create a wrapper component that handles client-side rendering
const OpenPassportQRcodeWrapper: React.FC<OpenPassportQRcodeProps> = (props) => {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  if (!isClient) {
    return null;
  }

  return <OpenPassportQRcode {...props} />;
};

// Your existing OpenPassportQRcode component
const OpenPassportQRcode: React.FC<OpenPassportQRcodeProps> = ({
  appName,
  userId,
  userIdType,
  openPassportVerifier,
  onSuccess,
  websocketUrl = WS_URL,
  size = 300,
}) => {
  const [proofStep, setProofStep] = useState(QRcodeSteps.WAITING_FOR_MOBILE);
  const [proofVerified, setProofVerified] = useState(false);
  const [sessionId, setSessionId] = useState(uuidv4());

  useEffect(() => {
    initWebSocket(
      websocketUrl,
      sessionId,
      setProofStep,
      setProofVerified,
      openPassportVerifier,
      onSuccess
    );
  }, [sessionId, websocketUrl, openPassportVerifier]);

  const generateUniversalLink = () => {
    const baseUrl = WS_URL;
    const path = '/websocket';
    const data = openPassportVerifier.getIntent(appName, userId, userIdType, sessionId);
    return `${baseUrl}${path}?data=${data}`;
  };

  const renderProofStatus = () => (
    <div style={containerStyle}>
      <div style={ledContainerStyle}>
        <LED connectionStatus={proofStep} />
      </div>
      <div style={qrContainerStyle(size)}>
        {(() => {
          switch (proofStep) {
            case QRcodeSteps.PROOF_GENERATION_STARTED:
            case QRcodeSteps.PROOF_GENERATED:
              return <BounceLoader loading={true} size={200} color="#94FBAB" />;
            case QRcodeSteps.PROOF_VERIFIED:
              if (proofVerified) {
                return (
                  <Lottie
                    animationData={CHECK_ANIMATION}
                    style={{ width: 200, height: 200 }}
                    onComplete={() => {
                      setProofStep(QRcodeSteps.WAITING_FOR_MOBILE);
                    }}
                    loop={false}
                  />
                );
              } else {
                return (
                  <Lottie
                    animationData={X_ANIMATION}
                    style={{ width: 200, height: 200 }}
                    onComplete={() => {
                      setProofStep(QRcodeSteps.WAITING_FOR_MOBILE);
                    }}
                    loop={false}
                  />
                );
              }
            default:
              return (
                <QRCodeSVG
                  value={generateUniversalLink()}
                  size={size}
                />
              );
          }
        })()}
      </div>
    </div>
  );

  return <div style={containerStyle}>{renderProofStatus()}</div>;
};

export default OpenPassportQRcodeWrapper;
