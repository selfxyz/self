import React, {
  PropsWithChildren,
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';

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
  resetProof: () => void;
}

const defaults: IProofContext = {
  status: ProofStatusEnum.PENDING,
  proofVerificationResult: null,
  selectedApp: {} as SelfApp,
  setSelectedApp: (_: SelfApp) => undefined,
  cleanSelfApp: () => undefined,
  setProofVerificationResult: (_: unknown) => undefined,
  setStatus: (_: ProofStatusEnum) => undefined,
  resetProof: () => undefined,
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
  const [status, setStatus] = useState<ProofStatusEnum>(
    ProofStatusEnum.PENDING,
  );
  const [proofVerificationResult, setProofVerificationResult] =
    useState<unknown>(defaults.proofVerificationResult);
  const [selectedApp, setSelectedAppInternal] = useState<SelfApp>(
    defaults.selectedApp,
  );

  // reset all the values so it not in wierd state
  const setSelectedApp = useCallback((app: SelfApp) => {
    console.log('[ProofProvider] Setting new app:', app);
    if (!app || Object.keys(app).length === 0) {
      console.log('[ProofProvider] Ignoring empty app data');
      return;
    }
    setStatus(ProofStatusEnum.PENDING);
    setProofVerificationResult(null);
    setSelectedAppInternal(app);
  }, []);

  const cleanSelfApp = useCallback(() => {
    const emptySelfApp: SelfApp = {
      appName: '',
      logoBase64: '',
      scope: '',
      endpointType: 'https',
      endpoint: '',
      header: '',
      sessionId: '',
      userId: '',
      userIdType: 'uuid',
      devMode: true,
      disclosures: {},
    };
    setSelectedAppInternal(emptySelfApp);
  }, []);

  // New function to reset the proof status and related state
  const resetProof = useCallback(() => {
    setStatus(ProofStatusEnum.PENDING);
    setProofVerificationResult(null);
    setSelectedAppInternal(defaults.selectedApp);
  }, []);

  // Make the setter available globally
  useEffect(() => {
    globalSetProofStatus = setStatus;
    return () => {
      globalSetProofStatus = null;
    };
  }, [setStatus]);

  useEffect(() => {
    const universalLinkCleanup = setupUniversalLinkListener(setSelectedApp);
    return () => {
      universalLinkCleanup();
    };
  }, []);

  const publicApi: IProofContext = useMemo(
    () => ({
      status,
      proofVerificationResult,
      selectedApp,
      setSelectedApp,
      cleanSelfApp,
      setProofVerificationResult,
      setStatus,
      resetProof,
    }),
    [
      status,
      proofVerificationResult,
      selectedApp,
      setSelectedApp,
      cleanSelfApp,
      resetProof,
    ],
  );

  return (
    <ProofContext.Provider value={publicApi}>{children}</ProofContext.Provider>
  );
}

export const useProofInfo = () => {
  return React.useContext(ProofContext);
};
