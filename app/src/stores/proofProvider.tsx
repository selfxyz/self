import React, {
  PropsWithChildren,
  createContext,
  useEffect,
  useState,
} from 'react';

import io, { Socket } from 'socket.io-client';

import { SelfApp } from '../../../common/src/utils/appType';
import { setupUniversalLinkListener } from '../utils/qrCodeNew';

// failure means that one of the requirements was not met, error means we fucked up.
export type ProofStatus = 'success' | 'failure' | 'pending' | 'error';

interface IProofContext {
  status: ProofStatus;
  proofVerificationResult: unknown;
  selectedApp: SelfApp;
  setSelectedApp: (app: SelfApp) => void;
  setProofVerificationResult: (result: unknown) => void;
  setStatus: (status: ProofStatus) => void;
}

const defaults: IProofContext = {
  status: 'pending',
  proofVerificationResult: null,
  selectedApp: {} as SelfApp,
  setSelectedApp: (_: SelfApp) => undefined,
  setProofVerificationResult: (_: unknown) => undefined,
  setStatus: (_: ProofStatus) => undefined,
};

const ProofContext = createContext<IProofContext>(defaults);

const Provider = ProofContext.Provider;

/*
 store to manage the proof verification process, including app the is requesting, intemidiate status and final result
 */
export function ProofProvider({ children }: PropsWithChildren) {
  const [status, setStatus] = useState<ProofStatus>(defaults.status);
  const [proofVerificationResult, setProofVerificationResult] =
    useState<unknown>(defaults.proofVerificationResult);
  const [selectedApp, _setSelectedApp] = useState<SelfApp>(
    defaults.selectedApp,
  );
  const [_, setSocket] = useState<Socket | null>(null);

  // reset all the values so it not in wierd state
  function setSelectedApp(app: SelfApp) {
    setStatus('pending');
    setProofVerificationResult(null);
    _setSelectedApp(app);
  }

  useWebsocket(selectedApp, setStatus, setProofVerificationResult, setSocket);

  useEffect(() => {
    const universalLinkCleanup = setupUniversalLinkListener(setSelectedApp);
    return () => {
      universalLinkCleanup();
    };
  }, []);

  const publicApi: IProofContext = {
    status,
    proofVerificationResult,
    selectedApp,
    setStatus,
    setSelectedApp,
    setProofVerificationResult,
  };

  return <Provider value={publicApi}>{children}</Provider>;
}

export const useProofInfo = () => {
  return React.useContext(ProofContext);
};

// TODO store sockon on a ref?
// handle it unmounting in progress?
//
function useWebsocket(
  selectedApp: SelfApp,
  setStatus: React.Dispatch<React.SetStateAction<ProofStatus>>,
  setProofVerificationResult: React.Dispatch<unknown>,
  setSocket: React.Dispatch<React.SetStateAction<Socket | null>>,
) {
  useEffect(() => {
    let newSocket: Socket | null = null;

    if (!selectedApp.websocketUrl || !selectedApp.sessionId) {
      return;
    }
    console.log('creating ws', selectedApp.websocketUrl, selectedApp.sessionId);

    try {
      newSocket = io(selectedApp.websocketUrl, {
        path: '/websocket',
        transports: ['websocket'],
        query: { sessionId: selectedApp.sessionId, clientType: 'mobile' },
      });

      newSocket.on('connect', () => {
        console.log('Connected to WebSocket server');
      });

      newSocket.on('disconnect', () => {
        console.log('Disconnected from WebSocket server');
      });

      newSocket.on('connect_error', error => {
        console.error('Connection error:', error);
        console.log('Error', {
          message: 'Failed to connect to WebSocket server',
          customData: {
            type: 'error',
          },
        });
        setStatus('error');
      });

      newSocket.on('proof_verification_result', result => {
        const data = JSON.parse(result);
        setProofVerificationResult(data);
        console.log('result', result, data);
        if (data.valid) {
          setStatus('success');
          console.log('✅', {
            message: 'Identity verified',
            customData: {
              type: 'success',
            },
          });
        } else {
          setStatus('failure');
          console.log('❌', {
            message: 'Verification failed',
            customData: {
              type: 'info',
            },
          });
        }
      });

      setSocket(newSocket);
    } catch (error) {
      console.error('Error setting up WebSocket:', error);
      setStatus('error');
      console.log('❌', {
        message: 'Failed to set up connection',
        customData: {
          type: 'error',
        },
      });
    }
    return () => {
      if (newSocket) {
        newSocket.disconnect();
        setSocket(null);
      }
    };
  }, [selectedApp.websocketUrl, selectedApp.sessionId]);
}
