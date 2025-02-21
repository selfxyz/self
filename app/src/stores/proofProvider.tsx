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
  selectedApp: SelfApp;
  setSelectedApp: (app: SelfApp) => void;
  cleanSelfApp: () => void;
  resetProof: () => void;
}

const defaults: IProofContext = {
  registrationStatus: ProofStatusEnum.PENDING,
  disclosureStatus: ProofStatusEnum.PENDING,
  selectedApp: {
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
  },
  setSelectedApp: (_: SelfApp) => undefined,
  cleanSelfApp: () => undefined,
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

  const [selectedApp, setSelectedAppInternal] = useState<SelfApp>(
    defaults.selectedApp,
  );

  const setSelectedApp = useCallback((app: SelfApp) => {
    if (!app || Object.keys(app).length === 0) {
      return;
    }
    setRegistrationStatus(ProofStatusEnum.PENDING);
    setSelectedAppInternal(app);
  }, []);

  const cleanSelfApp = useCallback(() => {
    setSelectedAppInternal(defaults.selectedApp);
  }, []);

  // why do we have both resetProof and cleanSelfApp?
  // possible we can make resetProof only about registration status, and clean app about disclosures status
  const resetProof = useCallback(() => {
    setRegistrationStatus(ProofStatusEnum.PENDING);
    setDisclosureStatus(ProofStatusEnum.PENDING);
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
      selectedApp,
      setSelectedApp,
      cleanSelfApp,
      resetProof,
    }),
    [
      registrationStatus,
      disclosureStatus,
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
