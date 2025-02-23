import React, { useEffect, useState, useRef } from 'react';
import { BounceLoader } from 'react-spinners';
import Lottie from 'lottie-react';
import CHECK_ANIMATION from './animations/check_animation.json';
import X_ANIMATION from './animations/x_animation.json';
import LED from './components/LED';
import { REDIRECT_URL, WS_DB_RELAYER } from '../../common/src/constants/constants';
import { v4 as uuidv4 } from 'uuid';
import { QRcodeSteps } from './utils/utils';
import { containerStyle, ledContainerStyle, qrContainerStyle } from './utils/styles';
import dynamic from 'next/dynamic';
import { initWebSocket } from './utils/websocket';
import { SelfApp, SelfAppBuilder } from '../../common/src/utils/appType';

const QRCodeSVG = dynamic(() => import('qrcode.react').then((mod) => mod.QRCodeSVG), {
  ssr: false,
});

interface SelfQRcodeProps {
  selfApp: SelfApp;
  onSuccess: () => void;
  websocketUrl?: string;
  size?: number;
  darkMode?: boolean;
  children?: React.ReactNode;
}

// Create a wrapper component that handles client-side rendering
const SelfQRcodeWrapper = (props: SelfQRcodeProps) => {
  const [isClient, setIsClient] = useState(false);
  useEffect(() => {
    setIsClient(true);
  }, []);

  if (!isClient) {
    return null;
  }
  return <SelfQRcode {...props} />;
};

// Your existing SelfQRcode component
const SelfQRcode = ({
  selfApp,
  onSuccess,
  websocketUrl = WS_DB_RELAYER,
  size = 300,
  darkMode = false,
}: SelfQRcodeProps) => {
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
                  bgColor={darkMode ? '#000000' : '#ffffff'}
                  fgColor={darkMode ? '#ffffff' : '#000000'}
                />
              );
          }
        })()}
      </div>
    </div>
  );

  return <div style={containerStyle}>{renderProofStatus()}</div>;
};

// Export the wrapper component as the default export
export default SelfQRcodeWrapper;

// Also export other components/types that might be needed
export { SelfQRcode, SelfApp, SelfAppBuilder };