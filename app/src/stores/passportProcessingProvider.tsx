import { useEffect, useMemo } from 'react';

import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { getCommitmentTree, getDSCTree } from '../../../common/src/utils/trees';
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

interface PassportProcessingState {
  processingStatus: PassportProcessingStatus;
  error?: unknown;
  registrationPayload?: RegistrationPayload;
  serializedDscTree?: string;
  mockDscTree?: string;
  serializedPassportTree?: string;
  mockSerializedTree?: string;
  deployedCircuits?: string;
  circuitDNSMapping?: Record<string, string>;
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

          set({
            deployedCircuits: circuits,
            circuitDNSMapping: dnsMapping,
            mockSerializedTree: mockTree,
            serializedPassportTree: passportTree,
            mockDscTree: dscMockTree,
            serializedDscTree: dscTree,
            processingStatus: 'waiting-for-passport-to-validate',
          });
        } catch (e) {
          set({ processingStatus: 'error', error: e });
        }
      },

      validatePassport: async (passportData, privateKey, clearPassportData) => {
        const state = get();
        const isMock = passportData.documentType !== 'passport';
        const dscTree = isMock ? state.mockDscTree : state.serializedDscTree;
        const passportTree = isMock
          ? state.mockSerializedTree
          : state.serializedPassportTree;
        if (
          !state.deployedCircuits ||
          !state.circuitDNSMapping ||
          !dscTree ||
          !passportTree
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

          set({ processingStatus: 'checking-registration' });

          const dscInputs = await generateTeeInputsDsc(
            passportData,
            endpointType,
            supportCheckResult.dscCircuitName!,
          );

          const dscOk = await checkIdPassportDscIsInTree(
            passportData,
            dscTree,
            state.circuitDNSMapping,
            endpointType,
            supportCheckResult.dscCircuitName!,
            dscInputs,
          );
          const inputs = generateTeeInputsRegister(
            privateKey,
            passportData,
            supportCheckResult.registerCircuitName!,
            dscTree,
          );
          const isRegistered = isUserRegistered(
            passportData,
            privateKey,
            passportTree,
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
    mockDscTree,
    serializedDscTree,
    mockSerializedTree,
    serializedPassportTree,
    deployedCircuits,
    circuitDNSMapping,
    validatePassport,
    fetchCircuitData,
    registerValidPassport,
    processingStatus,
    error,
    isRegistered,
    start,
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
      const isMock = passportData?.documentType !== 'passport';
      const dscTree = isMock ? mockDscTree : serializedDscTree;
      const passportTree = isMock ? mockSerializedTree : serializedPassportTree;
      if (
        !passportData ||
        !privateKey ||
        !dscTree ||
        !passportTree ||
        !deployedCircuits ||
        !circuitDNSMapping
      ) {
        return;
      }
      resetProof();
      await validatePassport(passportData, privateKey, clearPassportData);
    })();
  }, [
    passportData,
    privateKey,
    resetProof,
    deployedCircuits,
    circuitDNSMapping,
    clearPassportData,
    mockDscTree,
    serializedDscTree,
    mockSerializedTree,
    serializedPassportTree,
    validatePassport,
    readyToValidatePassport,
  ]);

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
  };
};
