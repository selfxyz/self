import React, { useEffect, useState, useRef } from 'react';
import { BounceLoader } from 'react-spinners';
import Lottie from 'lottie-react';
import CHECK_ANIMATION from './animations/check_animation.json';
import X_ANIMATION from './animations/x_animation.json';
import LED from './components/LED';
import { REDIRECT_URL, WS_URL } from '../../common/src/constants/constants';
import { v4 as uuidv4 } from 'uuid';
import { QRcodeSteps } from './utils/utils';
import { containerStyle, ledContainerStyle, qrContainerStyle } from './utils/styles';
import dynamic from 'next/dynamic';
import { initWebSocket } from './utils/websocket';
import { SelfApp } from '../../common/src/utils/appType';
const QRCodeSVG = dynamic(() => import('qrcode.react').then((mod) => mod.QRCodeSVG), {
  ssr: false,
});

interface OpenPassportQRcodeProps {
  selfApp: SelfApp;
  onSuccess: () => void;
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
  selfApp,
  onSuccess,
  websocketUrl = WS_URL,
  size = 300,
}) => {
  const [proofStep, setProofStep] = useState(QRcodeSteps.WAITING_FOR_MOBILE);
  const [proofVerified, setProofVerified] = useState(false);
  const [sessionId] = useState(uuidv4());
  const socketRef = useRef<ReturnType<typeof initWebSocket> | null>(null);

  useEffect(() => {
    // Only initialize if we don't have a socket already
    if (!socketRef.current) {
      console.log('[QRCode] Initializing new WebSocket connection');
      socketRef.current = initWebSocket(
        websocketUrl,
        sessionId,
        selfApp,
        setProofStep,
        setProofVerified,
        onSuccess
      );
    }

    return () => {
      console.log('[QRCode] Cleaning up WebSocket connection');
      if (socketRef.current) {
        socketRef.current();
        socketRef.current = null;
      }
    };
  }, [websocketUrl, sessionId, selfApp, onSuccess]);

  const generateUniversalLink = () => {
    const baseUrl = REDIRECT_URL;
    return `${baseUrl}?sessionId=${sessionId}`;
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

export { OpenPassportQRcodeWrapper, SelfApp };
