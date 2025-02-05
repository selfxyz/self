import { resetGenericPassword } from 'react-native-keychain';

import { DEFAULT_DOB, DEFAULT_DOE, DEFAULT_PNUMBER } from '@env';
import { generateDscSecret } from '@openpassport/common/utils/csca';
import { PassportData, Proof } from '@openpassport/common/utils/types';
import { create } from 'zustand';

import {
  loadPassportData,
  loadSecretOrCreateIt,
  storePassportData,
} from '../utils/keychain';

interface UserState {
  passportNumber: string;
  dateOfBirth: string;
  dateOfExpiry: string;
  countryCode: string;
  registered: boolean;
  passportData: PassportData | null;
  secret: string;
  cscaProof: Proof | null;
  localProof: Proof | null;
  dscSecret: string | null;
  userLoaded: boolean;
  initUserStore: () => void;
  registerPassportData: (passportData: PassportData) => Promise<void>;
  clearPassportDataFromStorage: () => void;
  clearSecretFromStorage: () => void;
  clearProofsFromStorage: () => void;
  update: (patch: any) => void;
  deleteMrzFields: () => void;
  setRegistered: (registered: boolean) => void;
  setDscSecret: (dscSecret: string) => void;
  setUserLoaded: (userLoaded: boolean) => void;
  proofVerificationResult: string;
  setProofVerificationResult: (proofVerificationResult: string) => void;
}

const useUserStore = create<UserState>((set, get) => ({
  userLoaded: false,
  passportNumber: DEFAULT_PNUMBER ?? '',
  dateOfBirth: DEFAULT_DOB ?? '',
  dateOfExpiry: DEFAULT_DOE ?? '',
  countryCode: '',
  dscSecret: null,
  registered: false,
  passportData: null,
  secret: '',
  cscaProof: null,
  localProof: null,
  setRegistered: (registered: boolean) => {
    set({ registered });
  },
  setDscSecret: (dscSecret: string) => {
    set({ dscSecret });
  },
  setUserLoaded: (userLoaded: boolean) => {
    set({ userLoaded });
  },
  proofVerificationResult: 'null',
  setProofVerificationResult: (proofVerificationResult: string) => {
    set({ proofVerificationResult });
  },
  // When user opens the app, checks presence of passportData
  // - If passportData is not present, starts the onboarding flow
  // - If passportData is present, then secret must be here too (they are always set together). Request the tree.
  // 	- If the commitment is present in the tree, proceed to main screen
  // 	- If the commitment is not present in the tree, proceed to main screen AND try registering it in the background
  initUserStore: async () => {
    // download zkeys if they are not already downloaded

    const secret = await loadSecretOrCreateIt();
    set({ secret });
    const dscSecret = await generateDscSecret();
    set({ dscSecret });

    const passportDataString = await loadPassportData();
    if (!passportDataString) {
      console.log('No passport data found, starting onboarding flow');
      set({
        userLoaded: true,
      });
      return;
    }

    // const isAlreadyRegistered = await isCommitmentRegistered(secret, JSON.parse(passportData));
    const isAlreadyRegistered = true;
    const passportData: PassportData = JSON.parse(passportDataString);

    if (!isAlreadyRegistered) {
      console.log(
        'not registered but passport data found, skipping to nextScreen',
      );
      set({
        passportData: passportData,
        userLoaded: true,
      });

      return;
    }

    console.log(
      'registered and passport data found, skipping to app selection screen',
    );
    set({
      passportData: passportData,
      registered: true,
    });
    set({ userLoaded: true });
  },

  // When reading passport for the first time:
  // - Check presence of secret. If there is none, create one and store it
  // 	- Store the passportData and try registering the commitment in the background
  registerPassportData: async passportData => {
    const alreadyStoredPassportData = await loadPassportData();

    if (alreadyStoredPassportData) {
      console.log(
        'a passportData is already stored, replacing it with the new one',
      );
    }

    await storePassportData(passportData);
    set({ passportData });
  },

  clearPassportDataFromStorage: async () => {
    await resetGenericPassword({ service: 'passportData' });
  },

  clearProofsFromStorage: async () => {
    get().cscaProof = null;
    get().localProof = null;
  },

  clearSecretFromStorage: async () => {
    await resetGenericPassword({ service: 'secret' });
  },

  update: patch => {
    set({
      ...get(),
      ...patch,
    });
  },

  deleteMrzFields: () =>
    set({
      passportNumber: '',
      dateOfBirth: '',
      dateOfExpiry: '',
    }),
}));

export default useUserStore;
