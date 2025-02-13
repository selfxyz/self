import React, {
  PropsWithChildren,
  createContext,
  useEffect,
  useState,
} from 'react';

import io, { Socket } from 'socket.io-client';

import { WS_DB_RELAYER_NEW } from '../../../common/src/constants/constants';
import { SelfApp } from '../../../common/src/utils/appType';
import { setupUniversalLinkListener } from '../utils/qrCodeNew';

export enum ProofStatusEnum {
  PENDING = 'pending',
  SUCCESS = 'success',
  FAILURE = 'failure',
  ERROR = 'error',
}

interface IProofContext {
  status: ProofStatusEnum;
  proofVerificationResult: unknown;
  selectedApp: SelfApp;
  setSelectedApp: (app: SelfApp) => void;
  cleanSelfApp: () => void;
  setProofVerificationResult: (result: unknown) => void;
  setStatus: (status: ProofStatusEnum) => void;
}

const defaults: IProofContext = {
  status: ProofStatusEnum.PENDING,
  proofVerificationResult: null,
  selectedApp: {} as SelfApp,
  setSelectedApp: (_: SelfApp) => undefined,
  cleanSelfApp: () => undefined,
  setProofVerificationResult: (_: unknown) => undefined,
  setStatus: (_: ProofStatusEnum) => undefined,
};

const ProofContext = createContext<IProofContext>(defaults);

// Global setter for proof status – accessible from non‑React code
let globalSetProofStatus: ((status: ProofStatusEnum) => void) | null = null;
export function updateGlobalProofStatus(status: ProofStatusEnum) {
  if (globalSetProofStatus) {
    globalSetProofStatus(status);
  }
}

/*
 store to manage the proof verification process, including app the is requesting, intemidiate status and final result
 */
export function ProofProvider({ children }: PropsWithChildren) {
  const [status, setStatus] = useState<ProofStatusEnum>(ProofStatusEnum.PENDING);
  const [proofVerificationResult, setProofVerificationResult] =
    useState<unknown>(defaults.proofVerificationResult);
  const [selectedApp, setSelectedAppInternal] = useState<SelfApp>(
    defaults.selectedApp,
  );
  const [socket, setSocket] = useState<Socket | null>(null);

  // reset all the values so it not in wierd state
  function setSelectedApp(app: SelfApp) {
    setStatus(ProofStatusEnum.PENDING);
    setProofVerificationResult(null);
    setSelectedAppInternal(app);
  }

  function cleanSelfApp() {
    const emptySelfApp: SelfApp = {
      appName: '',
      logoBase64: '',
      scope: '',
      sessionId: '',
      userId: '',
      userIdType: 'uuid',
      devMode: true,
      args: {
        disclosureOptions: [],
      },
    };
    setSelectedAppInternal(emptySelfApp);
  }

  // Make the setter available globally
  useEffect(() => {
    globalSetProofStatus = setStatus;
    return () => {
      globalSetProofStatus = null;
    };
  }, [setStatus]);

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
    setSelectedApp,
    cleanSelfApp,
    setProofVerificationResult,
    setStatus,
  };

  return <ProofContext.Provider value={publicApi}>{children}</ProofContext.Provider>;
}

export const useProofInfo = () => {
  return React.useContext(ProofContext);
};

// TODO store sockon on a ref?
// handle it unmounting in progress?
//
function useWebsocket(
  selectedApp: SelfApp,
  setStatus: React.Dispatch<React.SetStateAction<ProofStatusEnum>>,
  setProofVerificationResult: React.Dispatch<unknown>,
  setSocket: React.Dispatch<React.SetStateAction<Socket | null>>,
) {
  useEffect(() => {
    let newSocket: Socket | null = null;

    if (!selectedApp.sessionId) {
      return;
    }
    console.log('creating ws', WS_DB_RELAYER_NEW, selectedApp.sessionId);

    try {
      newSocket = io(WS_DB_RELAYER_NEW + '/websocket', {
        path: '/',
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
        setStatus(ProofStatusEnum.ERROR);
      });

      newSocket.on('proof_verification_result', result => {
        const data = JSON.parse(result);
        setProofVerificationResult(data);
        console.log('result', result, data);
        if (data.valid) {
          setStatus(ProofStatusEnum.SUCCESS);
          console.log('✅', {
            message: 'Identity verified',
            customData: {
              type: 'success',
            },
          });
        } else {
          setStatus(ProofStatusEnum.FAILURE);
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
      setStatus(ProofStatusEnum.ERROR);
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
  }, [selectedApp.sessionId]);
}
