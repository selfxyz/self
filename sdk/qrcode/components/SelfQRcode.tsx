import type { SelfApp } from '@selfxyz/sdk-common';
import { getUniversalLink, REDIRECT_URL, WS_DB_RELAYER } from '@selfxyz/sdk-common';
import React, { useEffect, useRef, useState } from 'react';
import { v4 as uuidv4 } from 'uuid';

import { qrWrapperStyle } from '../utils/styles.js';
import { QRcodeSteps } from '../utils/utils.js';
import { initWebSocket } from '../utils/websocket.js';
import DesktopQRcode from './DesktopQRcode.js';
import MobileQRcode from './MobileQRcode.js';
import QRCode from './QRCode.js';
import StatusBanner from './StatusBanner.js';

interface SelfQRcodeProps {
  selfApp: SelfApp;
  onSuccess: () => void;
  onError: (data: { error_code?: string; reason?: string }) => void;
  type?: 'websocket' | 'deeplink';
  websocketUrl?: string;
  size?: number;
  /**
   * Currently a no-op. The prop is kept for backward compatibility so existing
   * integrations don't break, but the wrapper always renders in light mode.
   */
  darkMode?: boolean;
  showBorder?: boolean;
  showStatusText?: boolean;
  variant?: 'hybrid' | 'desktop' | 'mobile';
}

/**
 * @deprecated The open-source Self Pass SDK is legacy. New integrations must use
 * `@selfxyz/enterprise-sdk`: redirect the user to the hosted `verificationUrl` —
 * you no longer render your own QR code.
 * Migration guide: https://docs.self.xyz/docs/self-enterprise/migration/from-self-pass-sdk/
 */
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

/**
 * @deprecated The open-source Self Pass SDK is legacy. New integrations must use
 * `@selfxyz/enterprise-sdk`: redirect the user to the hosted `verificationUrl` —
 * you no longer render your own QR code.
 * Migration guide: https://docs.self.xyz/docs/self-enterprise/migration/from-self-pass-sdk/
 */
const SelfQRcode = ({
  selfApp,
  onSuccess,
  onError,
  type = 'websocket',
  websocketUrl = WS_DB_RELAYER,
  size = 300,
  showBorder = true,
  showStatusText = true,
  variant = 'hybrid',
}: SelfQRcodeProps) => {
  const effectiveDarkMode = false;
  const [proofStep, setProofStep] = useState(QRcodeSteps.WAITING_FOR_MOBILE);
  const [sessionId, setSessionId] = useState('');
  const socketRef = useRef<ReturnType<typeof initWebSocket> | null>(null);

  // Refs for callbacks to avoid unnecessary WebSocket reconnections.
  const onSuccessRef = useRef(onSuccess);
  const onErrorRef = useRef(onError);
  const selfAppRef = useRef(selfApp);

  useEffect(() => {
    onSuccessRef.current = onSuccess;
    onErrorRef.current = onError;
    selfAppRef.current = selfApp;
  }, [onSuccess, onError, selfApp]);

  useEffect(() => {
    setSessionId(uuidv4());
  }, []);

  useEffect(() => {
    if (sessionId && !socketRef.current) {
      console.log('[QRCode] Initializing new WebSocket connection');
      socketRef.current = initWebSocket(
        websocketUrl,
        {
          ...selfAppRef.current,
          sessionId: sessionId,
        },
        type,
        setProofStep,
        () => onSuccessRef.current(),
        (data) => onErrorRef.current(data)
      );
    }

    return () => {
      console.log('[QRCode] Cleaning up WebSocket connection');
      if (socketRef.current) {
        socketRef.current();
        socketRef.current = null;
      }
    };
  }, [sessionId, type, websocketUrl]);

  if (!sessionId) {
    return null;
  }

  const qrValue =
    type === 'websocket'
      ? `${REDIRECT_URL}?sessionId=${sessionId}`
      : getUniversalLink({
          ...selfAppRef.current,
          sessionId: sessionId,
        });

  if (variant === 'mobile') {
    return (
      <MobileQRcode
        proofStep={proofStep}
        qrValue={qrValue}
        selfApp={selfAppRef.current}
        darkMode={effectiveDarkMode}
      />
    );
  }

  if (variant === 'desktop') {
    return (
      <DesktopQRcode
        proofStep={proofStep}
        qrValue={qrValue}
        size={size}
        darkMode={effectiveDarkMode}
        selfApp={selfAppRef.current}
      />
    );
  }

  return (
    <div
      style={qrWrapperStyle(proofStep, showBorder, effectiveDarkMode)}
      role="img"
      aria-label="Self authentication QR code"
    >
      <QRCode value={qrValue} size={size} proofStep={proofStep} />
      {showStatusText && <StatusBanner proofStep={proofStep} qrSize={size} />}
    </div>
  );
};

// Also export other components/types that might be needed
export { SelfQRcode, SelfQRcodeWrapper };
