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
  registrationStatus: ProofStatusEnum;
  disclosureStatus: ProofStatusEnum;
  proofVerificationResult: unknown;
  selectedApp: SelfApp;
  setSelectedApp: (app: SelfApp) => void;
  cleanSelfApp: () => void;
  setProofVerificationResult: (result: unknown) => void;
  resetProof: () => void;
}

const defaults: IProofContext = {
  registrationStatus: ProofStatusEnum.PENDING,
  disclosureStatus: ProofStatusEnum.PENDING,
  proofVerificationResult: null,
  selectedApp: {} as SelfApp,
  setSelectedApp: (_: SelfApp) => undefined,
  cleanSelfApp: () => undefined,
  setProofVerificationResult: (_: unknown) => undefined,
  resetProof: () => undefined,
};

export const ProofContext = createContext<IProofContext>(defaults);

export let globalSetRegistrationStatus:
  | ((status: ProofStatusEnum) => void)
  | null = null;
export let globalSetDisclosureStatus:
  | ((status: ProofStatusEnum) => void)
  | null = null;

/*
 store to manage the proof verification process, including app the is requesting, intemidiate status and final result
 */
export function ProofProvider({ children }: PropsWithChildren<{}>) {
  const [registrationStatus, setRegistrationStatus] = useState<ProofStatusEnum>(
    ProofStatusEnum.PENDING,
  );
  const [disclosureStatus, setDisclosureStatus] = useState<ProofStatusEnum>(
    ProofStatusEnum.PENDING,
  );
  const [proofVerificationResult, setProofVerificationResult] =
    useState<unknown>(defaults.proofVerificationResult);
  const [selectedApp, setSelectedAppInternal] = useState<SelfApp>(
    defaults.selectedApp,
  );

  const setSelectedApp = useCallback((app: SelfApp) => {
    if (!app || Object.keys(app).length === 0) {
      return;
    }
    setRegistrationStatus(ProofStatusEnum.PENDING);
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

  const resetProof = useCallback(() => {
    setRegistrationStatus(ProofStatusEnum.PENDING);
    setDisclosureStatus(ProofStatusEnum.PENDING);
    setProofVerificationResult(null);
    setSelectedAppInternal(defaults.selectedApp);
  }, []);

  useEffect(() => {
    globalSetRegistrationStatus = setRegistrationStatus;
    globalSetDisclosureStatus = setDisclosureStatus;
    return () => {
      globalSetRegistrationStatus = null;
      globalSetDisclosureStatus = null;
    };
  }, [setRegistrationStatus, setDisclosureStatus]);

  useEffect(() => {
    const universalLinkCleanup = setupUniversalLinkListener(setSelectedApp);
    return () => {
      universalLinkCleanup();
    };
  }, []);

  const publicApi: IProofContext = useMemo(
    () => ({
      registrationStatus,
      disclosureStatus,
      proofVerificationResult,
      selectedApp,
      setSelectedApp,
      cleanSelfApp,
      setProofVerificationResult,
      resetProof,
    }),
    [
      registrationStatus,
      disclosureStatus,
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
