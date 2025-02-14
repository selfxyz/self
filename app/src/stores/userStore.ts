import { resetGenericPassword } from 'react-native-keychain';

import { DEFAULT_DOB, DEFAULT_DOE, DEFAULT_PNUMBER } from '@env';
import { create } from 'zustand';

interface UserState {
  passportNumber: string;
  dateOfBirth: string;
  dateOfExpiry: string;
  countryCode: string;
  registered: boolean;
  userLoaded: boolean;
  initUserStore: () => void;
  clearPassportDataFromStorage: () => void;
  clearSecretFromStorage: () => void;
  update: (patch: any) => void;
  deleteMrzFields: () => void;
  setRegistered: (registered: boolean) => void;
  setUserLoaded: (userLoaded: boolean) => void;
}

const useUserStore = create<UserState>((set, get) => ({
  userLoaded: false,
  passportNumber: DEFAULT_PNUMBER ?? '',
  dateOfBirth: DEFAULT_DOB ?? '',
  dateOfExpiry: DEFAULT_DOE ?? '',
  countryCode: '',
  registered: false,
  setRegistered: (registered: boolean) => {
    set({ registered });
  },
  setUserLoaded: (userLoaded: boolean) => {
    set({ userLoaded });
  },
  // When user opens the app, checks presence of passportData
  // - If passportData is not present, starts the onboarding flow
  // - If passportData is present, then secret must be here too (they are always set together). Request the tree.
  // 	- If the commitment is present in the tree, proceed to main screen
  // 	- If the commitment is not present in the tree, proceed to main screen AND try registering it in the background
  initUserStore: async () => {
    // const secret = await loadSecretOrCreateIt();
    // set({ secret });
    // // const dscSecret = await generateDscSecret();
    // // set({ dscSecret });
    // const passportDataString = await loadPassportData();
    // const passportMetadataString = await loadPassportMetadata();
    // if (!passportDataString || !passportMetadataString) {
    //   console.log(
    //     'No passport data or metadata found, starting onboarding flow',
    //   );
    //   set({
    //     userLoaded: true,
    //   });
    //   return;
    // }
    // // const isAlreadyRegistered = await isCommitmentRegistered(secret, JSON.parse(passportData));
    // const isAlreadyRegistered = true;
    // const passportData: PassportData = JSON.parse(passportDataString);
    // const passportMetadata: PassportMetadata = JSON.parse(
    //   passportMetadataString,
    // );
    // if (!isAlreadyRegistered) {
    //   console.log(
    //     'not registered but passport data found, skipping to nextScreen',
    //   );
    //   set({
    //     passportData: passportData,
    //     passportMetadata: passportMetadata,
    //     userLoaded: true,
    //   });
    //   return;
    // }
    // console.log(
    //   'registered and passport data found, skipping to app selection screen',
    // );
    // set({
    //   passportData: passportData,
    //   passportMetadata: passportMetadata,
    //   registered: true,
    //   userLoaded: true,
    // });
  },

  clearPassportDataFromStorage: async () => {
    await resetGenericPassword({ service: 'passportData' });
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
