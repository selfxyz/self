import { useEffect, useMemo } from 'react';

import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import {
	getCSCATree,
	getCommitmentTree,
	getDSCTree,
} from '../../../common/src/utils/trees';
import type { PassportData } from '../../../common/src/utils/types';
import analytics from '../utils/analytics';
import {
	generateTeeInputsDsc,
	generateTeeInputsRegister,
} from '../utils/proving/inputs';
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

export type PassportProcessingStatus =
  | 'idle'
  | 'ready-to-process'
  | 'fetching-circuit-data'
  | 'waiting-for-passport-to-validate'
  | 'checking-support'
  | 'checking-registration'
  | 'ready-to-submit'
  | 'final'
  | 'error';

type CircuitDNSMapping = Record<string, string>;
interface PassportProcessingState {
  processingStatus: PassportProcessingStatus;
  error?: unknown;
  registrationPayload?: RegistrationPayload;
  dscTree?: string;
  mockDscTree?: string;
  passportTree?: string;
  mockPassportTree?: string;
  cscaTree?: string[][];
  mockCscaTree?: string[][];
  deployedCircuits?: string;
  circuitDNSMapping?: CircuitDNSMapping;
  isRegistered?: boolean;

  fetchCircuitData: () => Promise<void>;
  validatePassport: (
    passportData: PassportData,
    privateKey: string,
    clearPassportData: () => Promise<void>,
  ) => Promise<void>;
  registerValidPassport: () => Promise<void>;
  start: () => void;
}

export const usePassportProcessingStore = create<PassportProcessingState>()(
  persist(
    (set, get) => ({
      processingStatus: 'idle',

      fetchCircuitData: async () => {
        set({ processingStatus: 'fetching-circuit-data' });
        try {
          const [
            circuits,
            dnsMapping,
            mockPassportTree,
            passportTree,
            mockDscTree,
            dscTree,
            mockCscaTree,
            cscaTree,
          ] = await Promise.all([
            getDeployedCircuits(),
            getCircuitDNSMapping(),
            getCommitmentTree('mock_passport'),
            getCommitmentTree('passport'),
            getDSCTree('staging_celo'),
            getDSCTree('celo'),
            getCSCATree('staging_celo'),
            getCSCATree('celo'),
          ]);

          set({
            deployedCircuits: circuits,
            circuitDNSMapping: dnsMapping,
            mockPassportTree,
            passportTree,
            mockDscTree,
            dscTree,
            mockCscaTree,
            cscaTree,
            processingStatus: 'waiting-for-passport-to-validate',
          });
        } catch (e) {
          console.error(e);
          set({ processingStatus: 'error', error: e });
        }
      },

      validatePassport: async (passportData, privateKey, clearPassportData) => {
        const state = get();
        const isMock = passportData.documentType !== 'passport';
        const serializedDscTree = isMock ? state.mockDscTree : state.dscTree;
        const serializedPassportTree = isMock
          ? state.mockPassportTree
          : state.passportTree;
        const serializedCscaTree = isMock ? state.mockCscaTree : state.cscaTree;
        if (
          !state.deployedCircuits ||
          !state.circuitDNSMapping ||
          !serializedDscTree ||
          !serializedPassportTree ||
          !serializedCscaTree
        ) {
          return;
        }

        set({ processingStatus: 'checking-support' });

        try {
          const endpointType = isMock ? 'staging_celo' : 'celo';
          const [isNullifierOnchain, supportCheckResult] = await Promise.all([
            isPassportNullified(passportData),
            checkPassportSupported(passportData, state.deployedCircuits),
          ]);

          if (
            !supportCheckResult ||
            supportCheckResult.status !== 'passport_supported'
          ) {
            trackEvent('Passport not supported', {
              reason: supportCheckResult?.status,
              details: supportCheckResult?.error?.message,
            });
            await clearPassportData();
            set({
              processingStatus: 'error',
              error: new Error('Passport not supported'),
            });
            return;
          }

          if (!supportCheckResult.dscCircuitName) {
            set({
              processingStatus: 'error',
              error: new Error('dscCircuitName not found'),
            });
            return;
          }

          set({ processingStatus: 'checking-registration' });

          const dscInputs = generateTeeInputsDsc(
            passportData,
            serializedCscaTree,
          );

          const dscOk = await checkIdPassportDscIsInTree(
            passportData,
            serializedDscTree,
            state.circuitDNSMapping,
            endpointType,
            supportCheckResult.dscCircuitName,
            dscInputs,
          );
          const inputs = generateTeeInputsRegister(
            privateKey,
            passportData,
            serializedDscTree,
          );
          const isRegistered = isUserRegistered(
            passportData,
            privateKey,
            serializedPassportTree,
          );

          set({ isRegistered });

          if (isRegistered || isNullifierOnchain || !dscOk) {
            set({ processingStatus: 'final' });
            return;
          }

          if (!supportCheckResult.registerCircuitName) {
            set({
              processingStatus: 'error',
              error: new Error('Passport not supported'),
            });
            return;
          }

          set({
            registrationPayload: {
              inputs,
              registerCircuitName: supportCheckResult.registerCircuitName,
              circuitDNSMapping: state.circuitDNSMapping,
              endpointType,
            },
            processingStatus: 'ready-to-submit',
          });
        } catch (e) {
          console.error(e);
          set({ processingStatus: 'error', error: e });
        }
      },

      registerValidPassport: async () => {
        const { processingStatus, registrationPayload } = get();
        if (processingStatus === 'ready-to-submit' && registrationPayload) {
          await sendPayload(
            registrationPayload.inputs,
            'register',
            registrationPayload.registerCircuitName,
            registrationPayload.endpointType,
            'https://self.xyz',
            (registrationPayload.circuitDNSMapping as any).REGISTER[
              registrationPayload.registerCircuitName
            ],
            undefined,
            {
              updateGlobalOnSuccess: true,
              updateGlobalOnFailure: true,
              flow: 'registration',
            },
          );
          set({ processingStatus: 'final', isRegistered: true });
        }
      },

      start: () => {
        set({ processingStatus: 'ready-to-process' });
      },
    }),
    {
      name: 'passport-processing-storage',
      storage: createJSONStorage(() => AsyncStorage),
      onRehydrateStorage: state => {
        console.log(
          `Rehydrated passport processing store ${state.processingStatus}`,
        );
      },
    },
  ),
);
export const usePassportProcessing = () => {
  const passportProcessingStore = usePassportProcessingStore();
  const {
    validatePassport,
    fetchCircuitData,
    registerValidPassport,
    processingStatus,
    error,
    isRegistered,
    start,
    mockPassportTree,
    passportTree,
  } = passportProcessingStore;
  const { passportData, privateKey, clearPassportData } = usePassport();
  const { resetProof } = useProofInfo();

  const readyToValidatePassport = useMemo(
    () => processingStatus === 'waiting-for-passport-to-validate',
    [processingStatus],
  );

  const readyToFetchStaticData = useMemo(
    () => processingStatus === 'ready-to-process',
    [processingStatus],
  );

  useEffect(() => {
    (async () => {
      if (!readyToValidatePassport) {
        return;
      }
      if (!passportData || !privateKey) {
        return;
      }
      resetProof();
      await validatePassport(passportData, privateKey, clearPassportData);
    })();
  }, [
    readyToValidatePassport,
    passportData,
    privateKey,
    clearPassportData,
    resetProof,
    validatePassport,
  ]);
  const conditionalPassportTree = useMemo(() => {
    const isMock = passportData?.documentType !== 'passport';
    return isMock ? mockPassportTree : passportTree;
  }, [passportData, mockPassportTree, passportTree]);

  useEffect(() => {
    (async () => {
      if (!readyToFetchStaticData) {
        return;
      }
      try {
        await fetchCircuitData();
      } catch (e) {
        console.error(e);
      }
    })();
  }, [fetchCircuitData, readyToFetchStaticData]);

  return {
    start,
    processingStatus,
    error,
    isRegistered,
    registerValidPassport,
    passportTree: conditionalPassportTree,
  };
};
