import type { SelfApp } from '@selfxyz/sdk-common';
import { getUniversalLink, REDIRECT_URL, WS_DB_RELAYER } from '@selfxyz/sdk-common';
import React, { useEffect, useRef, useState } from 'react';
import { v4 as uuidv4 } from 'uuid';

import { qrWrapperStyle } from '../utils/styles.js';
import { QRcodeSteps } from '../utils/utils.js';
import { initWebSocket } from '../utils/websocket.js';
import QRCode from './QRCode.js';
import StatusBanner from './StatusBanner.js';

interface SelfQRcodeProps {
  selfApp: SelfApp;
  onSuccess: () => void;
  onError: (data: { error_code?: string; reason?: string }) => void;
  type?: 'websocket' | 'deeplink';
  websocketUrl?: string;
  size?: number;
  darkMode?: boolean;
  showBorder?: boolean;
  showStatusText?: boolean;
}

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

const SelfQRcode = ({
  selfApp,
  onSuccess,
  onError,
  type = 'websocket',
  websocketUrl = WS_DB_RELAYER,
  size = 300,
  darkMode = false,
  showBorder = true,
  showStatusText = true,
}: SelfQRcodeProps) => {
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

  return (
    <div
      style={qrWrapperStyle(proofStep, showBorder)}
      role="img"
      aria-label="Self authentication QR code"
    >
      <QRCode value={qrValue} size={size} darkMode={darkMode} proofStep={proofStep} />
      {showStatusText && <StatusBanner proofStep={proofStep} qrSize={size} />}
    </div>
  );
};

// Also export other components/types that might be needed
export { SelfQRcode, SelfQRcodeWrapper };
