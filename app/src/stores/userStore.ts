import { DEFAULT_DOB, DEFAULT_DOE, DEFAULT_PNUMBER } from '@env';
import { resetGenericPassword } from 'react-native-keychain';
import { create } from 'zustand';

import { generateDscSecret } from '../../../common/src/utils/csca';
import { PassportData, Proof } from '../../../common/src/utils/types';
import {
  loadPassportData,
  loadPassportMetadata,
  loadSecretOrCreateIt,
  storePassportData,
  storePassportMetadata,
} from '../utils/keychain';
import { PassportMetadata } from '../../../common/src/utils/parsePassportData';

interface UserState {
  passportNumber: string;
  dateOfBirth: string;
  dateOfExpiry: string;
  countryCode: string;
  registered: boolean;
  passportData: PassportData | null;
  passportMetadata: PassportMetadata | null;
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
  setPassportMetadata: (metadata: PassportMetadata) => void;
  clearPassportMetadataFromStorage: () => void;
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
  passportMetadata: null,
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
  setPassportMetadata: async (metadata: PassportMetadata) => {
    await storePassportMetadata(metadata);
    set({ passportMetadata: metadata });
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
    const secret = await loadSecretOrCreateIt();
    set({ secret });
    const dscSecret = await generateDscSecret();
    set({ dscSecret });

    const passportDataString = await loadPassportData();
    const passportMetadataString = await loadPassportMetadata();

    if (!passportDataString || !passportMetadataString) {
      console.log('No passport data or metadata found, starting onboarding flow');
      set({
        userLoaded: true,
      });
      return;
    }

    // const isAlreadyRegistered = await isCommitmentRegistered(secret, JSON.parse(passportData));
    const isAlreadyRegistered = true;
    const passportData: PassportData = JSON.parse(passportDataString);
    const passportMetadata: PassportMetadata = JSON.parse(passportMetadataString);

    if (!isAlreadyRegistered) {
      console.log('not registered but passport data found, skipping to nextScreen');
      set({
        passportData: passportData,
        passportMetadata: passportMetadata,
        userLoaded: true,
      });
      return;
    }

    console.log('registered and passport data found, skipping to app selection screen');
    set({
      passportData: passportData,
      passportMetadata: passportMetadata,
      registered: true,
      userLoaded: true,
    });
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

  clearPassportMetadataFromStorage: async () => {
    await resetGenericPassword({ service: 'passportMetadata' });
    set({ passportMetadata: null });
  },
}));

export default useUserStore;
