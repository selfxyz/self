import { create } from 'zustand'
import {
  DEFAULT_PNUMBER,
  DEFAULT_DOB,
  DEFAULT_DOE,
} from '@env';
import { mockPassportData_sha256WithRSAEncryption_65537 } from '../../../common/src/utils/mockPassportData';
import { PassportData } from '../../../common/src/utils/types';
import * as Keychain from 'react-native-keychain';
import * as amplitude from '@amplitude/analytics-react-native';
import useNavigationStore from './navigationStore';
import { Steps } from '../utils/utils';
import { downloadZkey } from '../utils/zkeyDownload';
import { generateCircuitInputsRegister } from '../../../common/src/utils/generateInputs';
import { PASSPORT_ATTESTATION_ID, RPC_URL } from '../../../common/src/constants/constants';
import { generateProof } from '../utils/prover';
import { formatSigAlg } from '../../../common/src/utils/utils';
import { sendRegisterTransaction } from '../utils/transactions';
import { loadPassportData, loadSecret, loadSecretOrCreateIt, storePassportData } from '../utils/keychain';
import { ethers } from 'ethers';

interface UserState {
  passportNumber: string
  dateOfBirth: string
  dateOfExpiry: string
  registered: boolean
  passportData: PassportData
  secret: string
  dscCertificate: any
  cscaProof: any
  initUserStore: () => void
  registerPassportData: (passportData: PassportData) => void
  registerCommitment: (passportData?: PassportData) => void
  clearPassportDataFromStorage: () => void
  clearSecretFromStorage: () => void
  update: (patch: any) => void
  deleteMrzFields: () => void
}

const useUserStore = create<UserState>((set, get) => ({
  passportNumber: DEFAULT_PNUMBER ?? "",
  dateOfBirth: DEFAULT_DOB ?? "",
  dateOfExpiry: DEFAULT_DOE ?? "",

  registered: false,
  passportData: mockPassportData_sha256WithRSAEncryption_65537,
  secret: "",
  dscCertificate: null,
  cscaProof: {},

  // When user opens the app, checks presence of passportData
  // - If passportData is not present, starts the onboarding flow
  // - If passportData is present, then secret must be here too (they are always set together). Request the tree.
  // 	- If the commitment is present in the tree, proceed to main screen
  // 	- If the commitment is not present in the tree, proceed to main screen AND try registering it in the background
  initUserStore: async () => {
    // download zkeys if they are not already downloaded
    downloadZkey("register_sha256WithRSAEncryption_65537"); // might move after nfc scanning
    downloadZkey("disclose");

    const secret = await loadSecretOrCreateIt();
    set({ secret });

    const passportData = await loadPassportData();
    if (!passportData) {
      console.log("No passport data found, starting onboarding flow")
      return;
    }

    console.log("skipping onboarding")
    set({
      passportData: JSON.parse(passportData),
      registered: true,
    });
    useNavigationStore.getState().setStep(Steps.REGISTERED); // this means go to app selection screen

    // TODO: check if the commitment is already registered, if not retry registering it

    // set({
    //   registered: true,
    // });
  },

  // When reading passport for the first time:
  // - Check presence of secret. If there is none, create one and store it
  // 	- Store the passportData and try registering the commitment in the background
  registerPassportData: async (passportData) => {

    const alreadyStoredPassportData = await loadPassportData();

    if (alreadyStoredPassportData) {
      console.log("passportData is already stored, this should never happen in prod")
      console.log("replacing it with the new one")
    }

    await storePassportData(passportData)
    set({ passportData });
  },

  registerCommitment: async (mockPassportData?: PassportData) => {
    const {
      toast,
      setStep
    } = useNavigationStore.getState();
    const secret = await loadSecret() as string;
    let passportData = get().passportData
    if (mockPassportData) {
      passportData = mockPassportData
    }
    console.log("register commitment")
    console.log(secret)
    console.log(passportData)

    try {
      const inputs = generateCircuitInputsRegister(
        secret,
        PASSPORT_ATTESTATION_ID,
        passportData,
        121,
        17
      );

      amplitude.track(`Sig alg supported: ${passportData.signatureAlgorithm}`);
      console.log("userStore - inputs - Object.keys(inputs).forEach((key) => {...")
      Object.keys(inputs).forEach((key) => {
        if (Array.isArray(inputs[key as keyof typeof inputs])) {
          console.log(key, inputs[key as keyof typeof inputs].slice(0, 10), '...');
        } else {
          console.log(key, inputs[key as keyof typeof inputs]);
        }
      });

      const start = Date.now();

      const sigAlgFormatted = formatSigAlg(passportData.signatureAlgorithm, passportData.pubKey.exponent);
      const proof = await generateProof(
        `register_${sigAlgFormatted}`,
        inputs
      );

      console.log('proof:', proof);

      const end = Date.now();
      console.log('Total proof time from frontend:', end - start);
      amplitude.track('Proof generation successful, took ' + ((end - start) / 1000) + ' seconds');

      const provider = new ethers.JsonRpcProvider(RPC_URL);

      const serverResponse = await sendRegisterTransaction(proof, get().cscaProof)
      const txHash = serverResponse?.data.hash;

      const receipt = await provider.waitForTransaction(txHash);
      console.log('receipt status:', receipt?.status);

      if (receipt?.status === 0) {
        throw new Error("Transaction failed");
      }

      set({ registered: true });
      setStep(Steps.REGISTERED);
    } catch (error: any) {
      console.error(error);
      toast?.show('Error', {
        message: "Error registering your identity, please relaunch the app",
        customData: {
          type: "error",
        },
      })
      amplitude.track(error.message);
    }
  },

  clearPassportDataFromStorage: async () => {
    await Keychain.resetGenericPassword({ service: "passportData" });
  },

  clearSecretFromStorage: async () => {
    await Keychain.resetGenericPassword({ service: "secret" });
  },

  update: (patch) => {
    set({
      ...get(),
      ...patch,
    });
  },

  deleteMrzFields: () => set({
    passportNumber: "",
    dateOfBirth: "",
    dateOfExpiry: "",
  }),
}))

export default useUserStore