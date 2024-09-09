import React, { useEffect, useState } from 'react';
import {
  OpenPassport1StepInputs,
  OpenPassport1StepVerifier,
  OpenPassportVerifierReport,
} from '../index.web';
import { BounceLoader } from 'react-spinners';
import Lottie from 'lottie-react';
import CHECK_ANIMATION from './animations/check_animation.json';
import X_ANIMATION from './animations/x_animation.json';
import LED from './components/LED';
import { DEFAULT_USER_ID_TYPE, WEBSOCKET_URL } from '../../../common/src/constants/constants';
import { UserIdType } from '../../../common/src/utils/utils';
import { reconstructAppType } from '../../../common/src/utils/appType';
import { v4 as uuidv4 } from 'uuid';
import { QRcodeSteps } from './utils/utils';
import { containerStyle, ledContainerStyle, qrContainerStyle } from './utils/styles';
import dynamic from 'next/dynamic';
import { initWebSocket } from './utils/websocket';

const QRCodeSVG = dynamic(
  () => import('qrcode.react').then((mod) => mod.QRCodeSVG),
  { ssr: false }
);

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
  onSuccess = () => { },
  devMode = false,
  size = 300,
  websocketUrl = WEBSOCKET_URL,
}) => {
  const [proofStep, setProofStep] = useState(QRcodeSteps.WAITING_FOR_MOBILE);
  const [proofVerified, setProofVerified] = useState(null);
  const [sessionId, setSessionId] = useState(uuidv4());

  const openPassport1StepVerifier = new OpenPassport1StepVerifier({ scope: scope, requirements: requirements, dev_mode: devMode });

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
    initWebSocket(websocketUrl, sessionId, setProofStep, setProofVerified, openPassport1StepVerifier, onSuccess);
  }, [sessionId, websocketUrl]);

  const renderProofStatus = () => (
    <div style={containerStyle}>
      <div style={ledContainerStyle}>
        <LED
          connectionStatus={proofStep}
        />
      </div>
      <div style={qrContainerStyle(size)}>
        {(() => {
          switch (proofStep) {
            case QRcodeSteps.PROOF_GENERATION_STARTED:
            case QRcodeSteps.PROOF_GENERATED:
              return <BounceLoader loading={true} size={200} color="#94FBAB" />;
            case QRcodeSteps.PROOF_VERIFIED:
              if (proofVerified) {
                return <Lottie
                  animationData={CHECK_ANIMATION}
                  style={{ width: 200, height: 200 }}
                  onComplete={() => {
                    setProofStep(QRcodeSteps.WAITING_FOR_MOBILE);
                  }}
                  loop={false}
                />
              } else {
                return <Lottie
                  animationData={X_ANIMATION}
                  style={{ width: 200, height: 200 }}
                  onComplete={() => {
                    setProofStep(QRcodeSteps.WAITING_FOR_MOBILE);
                  }}
                  loop={false}
                />
              }
            default:
              return <QRCodeSVG value={getAppStringified()} size={size} />;
          }
        })()}
      </div>
    </div>
  );

  return <div style={containerStyle}>{renderProofStatus()}</div>;
};

export { OpenPassportQRcode };
