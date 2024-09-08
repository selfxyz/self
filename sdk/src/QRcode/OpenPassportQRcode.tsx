import React, { useEffect, useRef, useState } from 'react';
import {
  AppType,
  OpenPassport1StepInputs,
  OpenPassport1StepVerifier,
  OpenPassportVerifierReport,
} from '../index.web';
import io from 'socket.io-client';
import { BounceLoader } from 'react-spinners';
import Lottie from 'lottie-react';
import CHECK_ANIMATION from './animations/check_animation.json';
import X_ANIMATION from './animations/x_animation.json';
import LED from './LED';
import { DEFAULT_USER_ID_TYPE, WEBSOCKET_URL } from '../../../common/src/constants/constants';
import { UserIdType } from '../../../common/src/utils/utils';
import { reconstructAppType } from '../../../common/src/utils/appType';
import { v4 as uuidv4 } from 'uuid';
import { ProofSteps } from './utils';
import { containerStyle, ledContainerStyle, qrContainerStyle } from './styles';
import { QRCodeSVG } from 'qrcode.react';

interface OpenPassportQRcodeProps {
  appName: string;
  scope: string;
  userId: string;
  userIdType?: UserIdType;
  requirements?: string[][];
  onSuccess: (proof: OpenPassport1StepInputs, report: OpenPassportVerifierReport) => void;
  devMode?: boolean;
  size?: number;
  websocketUrl?: string;
}

const OpenPassportQRcode: React.FC<OpenPassportQRcodeProps> = ({
  appName,
  scope,
  userId,
  userIdType = DEFAULT_USER_ID_TYPE,
  requirements,
  onSuccess,
  devMode = false,
  size = 300,
  websocketUrl = WEBSOCKET_URL,
}) => {
  const [proofStep, setProofStep] = useState(ProofSteps.WAITING_FOR_MOBILE);
  const [proofVerified, setProofVerified] = useState(null);
  const [sessionId, setSessionId] = useState(uuidv4());
  const [showAnimation, setShowAnimation] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('disconnected');
  const [animationKey, setAnimationKey] = useState(0);

  const lottieRef = useRef(null);

  const handleAnimationComplete = () => {
    setShowAnimation(false);
    setProofStep(ProofSteps.WAITING_FOR_MOBILE);
    const newSessionId = uuidv4()
    setSessionId(newSessionId);
  };

  const getAppStringified = () => {
    return JSON.stringify(reconstructAppType({
      name: appName,
      scope: scope,
      userId: userId,
      userIdType: userIdType,
      sessionId: sessionId,
      circuit: 'prove',
      arguments: {
        disclosureOptions: Object.fromEntries(requirements),
      },
      websocketUrl: websocketUrl,
    }));
  }

  useEffect(() => {
    const newSocket = io(websocketUrl, {
      path: '/websocket',
      query: { sessionId, clientType: 'web' },
    });

    const handleMobileStatus = async (data) => {
      console.log('Received mobile status:', data.status);
      switch (data.status) {
        case 'mobile_connected':
          setConnectionStatus('mobile_connected');
          setProofStep(ProofSteps.MOBILE_CONNECTED);
          break;
        case 'mobile_disconnected':
          setConnectionStatus('web_connected');
          break;
        case 'proof_generation_started':
          setProofStep(ProofSteps.PROOF_GENERATION_STARTED);
          break;
        case 'proof_generated':
          setProofStep(ProofSteps.PROOF_GENERATED);
          break;
        case 'proof_generation_failed':
          setSessionId(uuidv4());
          setProofStep(ProofSteps.WAITING_FOR_MOBILE);
          break;
      }

      if (data.proof) {
        const openPassport1StepVerifier = new OpenPassport1StepVerifier({
          scope,
          requirements,
          dev_mode: devMode,
        });

        try {
          const local_proofVerified: OpenPassportVerifierReport =
            await openPassport1StepVerifier.verify(data.proof);
          setProofVerified({ valid: local_proofVerified.valid });
          setProofStep(ProofSteps.PROOF_VERIFIED);
          newSocket.emit('proof_verified', {
            sessionId,
            proofVerified: local_proofVerified.toString(),
          });
          if (local_proofVerified.valid && onSuccess) {
            const openPassport1StepInputs = new OpenPassport1StepInputs(data.proof);
            onSuccess(openPassport1StepInputs, local_proofVerified);
          }
        } catch (error) {
          console.error('Error verifying proof:', error);
          setProofVerified({ valid: false, error: error.message });
          newSocket.emit('proof_verified', {
            sessionId,
            proofVerified: { valid: false, error: error.message },
          });
        }
      }
    };

    newSocket.on('connect', () => setConnectionStatus('web_connected'));
    newSocket.on('disconnect', () => {
      setConnectionStatus('disconnected');
      setProofStep(ProofSteps.WAITING_FOR_MOBILE);
    });
    newSocket.on('mobile_status', handleMobileStatus);
    return () => {
      newSocket.disconnect();
    };
  }, [sessionId]);


  useEffect(() => {
    if (proofStep === ProofSteps.PROOF_VERIFIED && proofVerified?.valid === true) {
      setShowAnimation(true);
      setAnimationKey((prev) => prev + 1);
    }
  }, [proofStep, proofVerified]);


  const renderProofStatus = () => (
    <div style={containerStyle}>
      <div style={ledContainerStyle}>
        <LED
          connectionStatus={
            connectionStatus as 'disconnected' | 'web_connected' | 'mobile_connected'
          }
        />
      </div>
      <div style={qrContainerStyle(size)}>
        {(() => {
          switch (proofStep) {
            case ProofSteps.WAITING_FOR_MOBILE:
            case ProofSteps.MOBILE_CONNECTED:
              return <QRCodeSVG value={getAppStringified()} size={size} />;
            case ProofSteps.PROOF_GENERATION_STARTED:
            case ProofSteps.PROOF_GENERATED:
              return <BounceLoader loading={true} size={200} color="#94FBAB" />;
            case ProofSteps.PROOF_VERIFIED:
              if (proofVerified?.valid === true) {
                return showAnimation ? (
                  <Lottie
                    key={animationKey}
                    lottieRef={lottieRef}
                    animationData={CHECK_ANIMATION}
                    style={{ width: 200, height: 200 }}
                    loop={false}
                    autoplay={true}
                    onComplete={handleAnimationComplete}
                  />
                ) : <QRCodeSVG value={getAppStringified()} size={size} />;
              } else {
                return (
                  <Lottie
                    key={animationKey}
                    lottieRef={lottieRef}
                    animationData={X_ANIMATION}
                    style={{ width: 200, height: 200 }}
                    loop={false}
                    autoplay={true}
                    onComplete={handleAnimationComplete}
                  />
                );
              }
            default:
              return <QRCodeSVG value={getAppStringified()} />;
          }
        })()}
      </div>
    </div>
  );

  return <div style={containerStyle}>{renderProofStatus()}</div>;
};

export { OpenPassportQRcode };
