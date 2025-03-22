import React, {
  type PropsWithChildren,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import { getCommitmentTree, getDSCTree } from '../../../common/src/utils/trees';
import analytics from '../utils/analytics';
import { generateTeeInputsRegister } from '../utils/proving/inputs';
import {
  type RegistrationPayload,
  checkIdPassportDscIsInTree,
  checkPassportSupported,
  getCircuitDNSMapping,
  getDeployedCircuits,
  isPassportNullified,
  isUserRegistered,
} from '../utils/proving/payload';
import { sendPayload } from '../utils/proving/tee';
import { usePassport } from './passportDataProvider';
import { useProofInfo } from './proofProvider';

const { trackEvent } = analytics();

interface IPassportProcessingContext {
  processingStatus: PassportProcessingStatus;
  isRegistered?: boolean;
  isNullified?: boolean;
  error?: unknown;
  registerValidPassport: () => Promise<void>;
}

const PassportProcessingContext = createContext<IPassportProcessingContext>({
  processingStatus: 'idle',
  registerValidPassport: () => Promise.resolve(),
});

export type PassportProcessingStatus =
  | 'idle'
  | 'fetching-circuit-data'
  | 'waiting-for-passport'
  | 'checking-support'
  | 'checking-registration'
  | 'final'
  | 'error';
interface PassportProcessingProviderProps extends PropsWithChildren {
  authenticationTimeoutinMs?: number;
}

async function registerPayload({
  inputs,
  registerCircuitName,
  circuitDNSMapping,
  endpointType,
}: RegistrationPayload) {
  await sendPayload(
    inputs,
    'register',
    registerCircuitName,
    endpointType,
    'https://self.xyz',
    (circuitDNSMapping as any).REGISTER[registerCircuitName],
    undefined,
    {
      updateGlobalOnSuccess: true,
      updateGlobalOnFailure: true,
      flow: 'registration',
    },
  );
}

export const PassportProcessingProvider = ({
  children,
}: PassportProcessingProviderProps) => {
  const { passportData, privateKey, clearPassportData } = usePassport();
  const [serializedDscTree, setSerializedDscTree] = useState<string>();
  const [mockDscTree, setMockDscTree] = useState<string>();
  const [serializedPassportTree, setSerializedPassportTree] =
    useState<string>();
  const [mockSerializedTree, setMockSerializedTree] = useState<string>();
  const [processingStatus, setProcessingStatus] =
    useState<PassportProcessingStatus>('idle');
  const [deployedCircuits, setDeployedCircuits] = useState<string>();
  const [circuitDNSMapping, setCircuitDNSMapping] =
    useState<Record<string, string>>();
  const [error, setError] = useState<unknown>();
  const [registrationPayload, setRegistrationPayload] =
    useState<RegistrationPayload>();
  const isProcessing = useRef(false);
  const registerValidPassport = useCallback(async () => {
    if (processingStatus !== 'final' || registrationPayload === undefined) {
      return;
    }
    await registerPayload(registrationPayload);
  }, [registrationPayload, processingStatus]);
  const { resetProof } = useProofInfo();

  useEffect(() => {
    (async () => {
      setProcessingStatus('fetching-circuit-data');
      console.log('Fetching circuit data...');
      try {
        const [
          circuits,
          dnsMapping,
          mockTree,
          passportTree,
          dscMockTree,
          dscTree,
        ] = await Promise.all([
          getDeployedCircuits(),
          getCircuitDNSMapping(),
          getCommitmentTree('mock_passport'),
          getCommitmentTree('passport'),
          getDSCTree('staging_celo'),
          getDSCTree('celo'),
        ]);
        setDeployedCircuits(circuits);
        setCircuitDNSMapping(dnsMapping);
        setMockSerializedTree(mockTree);
        setSerializedPassportTree(passportTree);
        setMockDscTree(dscMockTree);
        setSerializedDscTree(dscTree);
      } catch (e) {
        console.error('Error fetching circuit data:', e);
        setProcessingStatus('error');
        setError(e);
      }
      console.log('Circuit data fetched successfully');
      setProcessingStatus('waiting-for-passport');
    })();
  }, []);

  useEffect(() => {
    const isMock = passportData?.documentType !== 'passport';
    const dscTree = isMock ? mockDscTree : serializedDscTree;
    const passportTree = isMock ? mockSerializedTree : serializedPassportTree;
    if (
      isProcessing.current ||
      !passportData ||
      !privateKey ||
      !deployedCircuits ||
      !circuitDNSMapping ||
      !dscTree ||
      !passportTree
    ) {
      console.log('Passport data not ready', {
        passportData,
        privateKey,
        deployedCircuits,
        circuitDNSMapping,
        dscTree,
        passportTree,
      });
      return;
    }
    isProcessing.current = true;
    (async function bootstrapPassportValidation() {
      try {
        resetProof();
        setProcessingStatus('checking-support');
        console.log('Checking passport support...');
        const endpointType = isMock ? 'staging_celo' : 'celo';
        const [isNullifierOnchain, supportCheckResult] = await Promise.all([
          isPassportNullified(passportData),
          checkPassportSupported(passportData, deployedCircuits),
        ]);

        if (!supportCheckResult) {
          console.log('Passport support check failed');
          setProcessingStatus('error');
          setError(new Error('Passport support check failed'));
          isProcessing.current = false;
          return;
        }
        if (supportCheckResult.status !== 'passport_supported') {
          trackEvent('Passport not supported', {
            reason: supportCheckResult.status,
            details: supportCheckResult.error?.message,
          });
          console.log('Passport not supported');
          await clearPassportData();
          setProcessingStatus('error');
          setError(
            new Error(`Passport not supported: ${supportCheckResult.status}`),
          );
          isProcessing.current = false;
          return;
        }
        if (!supportCheckResult.registerCircuitName) {
          throw new Error(
            'Register Circuit name is missing from support check result',
          );
        }
        if (!supportCheckResult.dscCircuitName) {
          throw new Error(
            'DSC Circuit name is missing from support check result',
          );
        }
        setProcessingStatus('checking-registration');

        const [inputs, dscOk] = await Promise.all([
          generateTeeInputsRegister(
            privateKey,
            passportData,
            supportCheckResult.registerCircuitName,
            dscTree,
          ),
          checkIdPassportDscIsInTree(
            passportData,
            dscTree,
            circuitDNSMapping,
            endpointType,
            supportCheckResult.dscCircuitName,
          ),
        ]);
        const isRegistered = isUserRegistered(
          passportData,
          privateKey,
          passportTree,
        );
        console.log('User is registered:', isRegistered);
        if (isRegistered) {
          console.log(
            'Passport is registered already. Skipping to AccountVerifiedSuccess',
          );
          setProcessingStatus('final');
          isProcessing.current = false;
          return;
        }

        console.log('Passport is nullified:', isNullifierOnchain);
        if (isNullifierOnchain) {
          console.log(
            'Passport is nullified, but not registered with this secret. Prompt to restore secret from iCloud or manual backup',
          );
          setProcessingStatus('final');
          isProcessing.current = false;
          return;
        }
        console.log('Passport is not nullified');

        console.log('circuitDNSMapping', circuitDNSMapping);

        if (!dscOk) {
          throw new Error('DSC proof failed');
        }
        console.log('KKKKKKKKKKKKKKKKKKK');
        setRegistrationPayload({
          inputs,
          registerCircuitName: supportCheckResult.registerCircuitName,
          circuitDNSMapping,
          endpointType,
        });
        setProcessingStatus('final');
        isProcessing.current = false;
      } catch (e) {
        console.error('Error checking registration:', e);
        setProcessingStatus('error');
        setError(e);
      }
    })();
  }, [
    resetProof,
    passportData,
    privateKey,
    clearPassportData,
    deployedCircuits,
    circuitDNSMapping,
    mockDscTree,
    serializedDscTree,
    mockSerializedTree,
    serializedPassportTree,
  ]);

  const state: IPassportProcessingContext = useMemo(
    () => ({
      processingStatus,
      error,
      registerValidPassport,
      clearPassportData,
    }),
    [processingStatus, error, registerValidPassport, clearPassportData],
  );

  return (
    <PassportProcessingContext.Provider value={state}>
      {children}
    </PassportProcessingContext.Provider>
  );
};

export const usePassportProcessing = () => {
  const context = useContext(PassportProcessingContext);
  if (!context) {
    throw new Error(
      'usePassportProcessing must be used within a PassportProcessingProvider',
    );
  }
  return context;
};
