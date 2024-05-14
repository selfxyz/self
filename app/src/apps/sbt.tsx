import { AppType } from "../utils/appType";
import { Flame } from '@tamagui/lucide-icons';
import { Text, XStack, YStack } from 'tamagui';
import { generateProof } from "../utils/prover";
import useUserStore from "../stores/userStore";
import { generateCircuitInputs } from "../../../common/src/utils/generateInputs";
import EnterAddress from "../components/EnterAddress";
import { revealBitmapFromMapping } from "../../../common/src/utils/revealBitmap";
import useSbtStore from "../stores/sbtStore";
import useNavigationStore from "../stores/navigationStore";
import { Steps } from "../utils/utils";
import { mintSBT } from "../utils/minter";
import { ethers } from "ethers";
import * as amplitude from '@amplitude/analytics-react-native';
import Clipboard from "@react-native-community/clipboard";
import { shortenTxHash } from "../../utils/utils";
import { textColor1 } from "../utils/colors";
import { Pressable } from "react-native";

const sepolia = () => (
  <YStack ml="$2" p="$2" px="$3" bc="#0d1e18" borderRadius="$10">
    <Text color="#3bb178" fow="bold">Sepolia</Text>
  </YStack>
);

export const sbtApp: AppType = {
  id: 'soulbound',

  // AppScreen UI
  title: 'Soulbound Token',
  description: 'Mint a Soulbound Token and prove you\'re a human',
  colorOfTheText: 'black',
  selectable: true,
  icon: Flame,
  tags: [sepolia()],
  
  // ProveScreen UI
  name: 'Soulbound token',
  disclosureOptions: {
    nationality: "optional",
    expiry_date: "optional",
    older_than: "optional"
  },
  
  // SendProofScreen UI before sending proof
  beforeSendText1: "You can now use this proof to mint a Soulbound token.",
  beforeSendText2: "Disclosed information will be displayed on SBT.",
  sendButtonText: 'Mint Soulbound token',
  sendingButtonText: 'Minting...',

  // SendProofScreen UI after sending proof
  successTitle: 'You just have minted a Soulbound token 🎉',
  successText: 'You can now share this proof with the selected app.',

  successComponent: () => {
    const txHash = useSbtStore.getState().txHash;
    const toast = useNavigationStore.getState().toast;

    return (
      <Pressable onPress={() => {
          Clipboard.setString(txHash);
          toast?.show('🖨️', {
            message: "Tx copied to clipboard",
            customData: {
              type: "success",
            },
          })
        }}
      >
        <XStack jc='space-between' h="$2" ai="center">
          <Text color={textColor1} fontWeight="bold" fontSize="$5">
            Tx: {shortenTxHash(txHash)}
          </Text>
        </XStack>
      </Pressable>
    )
  },

  finalButtonAction: () => {
    const txHash = useSbtStore.getState().txHash;
    const toast = useNavigationStore.getState().toast;

    Clipboard.setString(txHash);
    toast?.show('🖨️', {
      message: "Tx copied to clipboard",
      customData: {
        type: "success",
      },
    })
  },

  finalButtonText: 'Copy to clipboard',


  circuit: "proof_of_passport", // will be "disclose" soon

  // fields the user can fill
  fields: [
    EnterAddress
  ],

  handleProve: async () => {
    const {
      update,
      disclosure,
      address,
      majority
    } = useSbtStore.getState();

    const {
      toast,
      setStep
    } = useNavigationStore.getState();

    setStep(Steps.GENERATING_PROOF);
    
    await new Promise(resolve => setTimeout(resolve, 10));
    const reveal_bitmap = revealBitmapFromMapping(disclosure);
  
    const passportData = useUserStore.getState().passportData;
  
    try {
      const inputs = generateCircuitInputs(
        passportData,
        reveal_bitmap,
        address,
        majority,
        { developmentMode: false }
      );

      // remove that when it's only disclosure proof
      amplitude.track(`Sig alg supported: ${passportData.signatureAlgorithm}`);
  
      Object.keys(inputs).forEach((key) => {
        if (Array.isArray(inputs[key as keyof typeof inputs])) {
          console.log(key, inputs[key as keyof typeof inputs].slice(0, 10), '...');
        } else {
          console.log(key, inputs[key as keyof typeof inputs]);
        }
      });
  
      const start = Date.now();

      const proof = await generateProof(
        sbtApp.circuit,
        inputs,
      );

      const end = Date.now();
      console.log('Total proof time from frontend:', end - start);
      amplitude.track('Proof generation successful, took ' + ((end - start) / 1000) + ' seconds');
      update({
        proof: proof,
        proofTime: end - start,
      });
      setStep(Steps.PROOF_GENERATED);
    } catch (error: any) {
      console.error(error);
      toast?.show('Error', {
        message: error.message,
        customData: {
          type: "error",
        },
      })
      setStep(Steps.NFC_SCAN_COMPLETED);
      amplitude.track(error.message);
    }
  },

  handleSendProof: async () => {
    const {
      update,
      proof
    } = useSbtStore.getState();

    const {
      toast,
      setStep
    } = useNavigationStore.getState();
    
    if (!proof) {
      console.error('Proof is not generated');
      return;
    }

    setStep(Steps.PROOF_SENDING);
    
    toast?.show('🚀',{
      message: "Transaction sent...",
      customData: {
        type: "info",
      },
    })

    const provider = new ethers.JsonRpcProvider('https://gateway.tenderly.co/public/sepolia');
    // https://mainnet.optimism.io

    try {
      const serverResponse = await mintSBT(
        proof,
        provider,
        "sepolia"
      )
      const txHash = serverResponse?.data.hash;

      setStep(Steps.PROOF_SENT);
      update({
        txHash: txHash,
        proofSentText: `SBT minting... Network: Sepolia. Transaction hash: ${txHash}`
      });
      
      const receipt = await provider.waitForTransaction(txHash);
      console.log('receipt status:', receipt?.status);

      if (receipt?.status === 1) {
        toast?.show('🎊', {
          message: "SBT minted",
          customData: {
            type: "success",
          },
        })
        update({
          proofSentText: `SBT minted. Network: Sepolia. Transaction hash: ${txHash}`
        });
      } else {
        toast?.show('Error', {
          message: "SBT mint failed",
          customData: {
            type: "error",
          },
        })
        update({
          proofSentText: `Error minting SBT. Network: Sepolia. Transaction hash: ${txHash}`
        });
        setStep(Steps.PROOF_GENERATED);
      }
    } catch (error: any) {
      setStep(Steps.PROOF_GENERATED);
      update({
        proofSentText: `Error minting SBT. Network: Sepolia.`
      });
      if (error.isAxiosError && error.response) {
        const errorMessage = error.response.data.error;
        console.log('Server error message:', errorMessage);
  
        // parse blockchain error and show it
        const match = errorMessage.match(/execution reverted: "([^"]*)"/);
        if (match && match[1]) {
          console.log('Parsed blockchain error:', match[1]);
          toast?.show('Error', {
            message: `Error: ${match[1]}`,
            customData: {
              type: "error",
            },
          })
        } else {
          toast?.show('Error', {
            message: `Error: mint failed`,
            customData: {
              type: "error",
            },
          })
          console.log('Failed to parse blockchain error');
        }
      }
      amplitude.track(error.message);
    }
  }
}

export default sbtApp;