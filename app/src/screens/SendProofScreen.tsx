import React from 'react';
import { YStack, XStack, Text, Button, Spinner } from 'tamagui';
import { Copy } from '@tamagui/lucide-icons';
import { formatDuration } from '../../utils/utils';
import { Steps } from '../utils/utils';
import ProofGrid from '../components/ProofGrid';
import { Platform } from 'react-native';
import { blueColor, borderColor, componentBgColor, textColor1, textColor2 } from '../utils/colors';
import useNavigationStore from '../stores/navigationStore';
import { AppType } from '../../../common/src/utils/appType';
import { appStoreMapping } from './ProveScreen';

const SendProofScreen: React.FC = () => {
  const {
    step,
  } = useNavigationStore();

  const selectedApp = useNavigationStore(state => state.selectedApp) as AppType;

  const {
    handleSendProof,
    beforeSendText1,
    beforeSendText2,
    sendButtonText,
    sendingButtonText,
    successTitle,
    successText,
    successComponent,
    finalButtonAction,
    finalButtonText,
  } = selectedApp;

  const useAppStore = appStoreMapping[selectedApp.id as keyof typeof appStoreMapping]

  const {
    proof,
    proofTime
  } = useAppStore();

  return (
    <YStack px="$4" f={1} mb={Platform.OS === 'ios' ? "$5" : "$0"}>
      {step === Steps.PROOF_SENT ? (
        <YStack flex={1} justifyContent='center' alignItems='center' gap="$5">
          <XStack flex={1} />
          <ProofGrid proof={proof} />

          <YStack gap="$1">
            <Text color={textColor1} fontWeight="bold" fontSize="$5">
              {successTitle}
            </Text>
            <Text color={textColor1} fontSize="$4" fow="bold" textAlign='left'>
              {successText}
            </Text>
            {successComponent()}
          </YStack>

          <XStack flex={1} />
          <Button
            borderRadius={100}
            onPress={finalButtonAction}
            marginTop="$4"
            mb="$8"
            backgroundColor="#3185FC"
          >
            <Copy color="white" size="$1" /><Text color={textColor1} fow="bold">
              {finalButtonText}
            </Text>
          </Button>

        </YStack>
      ) : (
        <YStack flex={1} justifyContent='center' alignItems='center' gap="$5" pt="$8">
          <ProofGrid proof={proof} />

          <YStack mt="$6" >
            <Text color={textColor1} fontWeight="bold" fontSize="$5" mt="$3">
              ZK proof generated  🎉
            </Text>
            <Text color={textColor2} mt="$1">
              Proof generation duration: {formatDuration(proofTime as number)}
            </Text>

            <Text color={textColor2} fontSize="$5" mt="$4" textAlign='left'>
              {beforeSendText1}
            </Text>
            <Text color={textColor2} fontSize="$4" mt="$2" textAlign='left'>
              {beforeSendText2}
            </Text>
          </YStack>
          <XStack flex={1} />

          <Button
            borderColor={borderColor}
            borderWidth={1.3}
            disabled={step === Steps.PROOF_SENDING}
            borderRadius={100}
            onPress={handleSendProof}
            marginTop="$4"
            mb="$4"
            backgroundColor="#0090ff"
          >
            {step === Steps.PROOF_SENDING ?
              <XStack gap="$2">
                <Spinner />
                <Text color={textColor1} fow="bold">
                  {sendingButtonText}
                </Text>
              </XStack>
              : <Text color={textColor1} fow="bold">
                {sendButtonText}
              </Text>
            }
          </Button>
        </YStack>
      )}
    </YStack>
  );
};

export default SendProofScreen;     
