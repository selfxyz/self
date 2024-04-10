import React, { useState, useEffect } from 'react';
import { YStack, XStack, Text, Button, Spinner } from 'tamagui';
import { Copy } from '@tamagui/lucide-icons';
import { formatDuration } from '../../utils/utils';
import { Steps } from '../utils/utils';
import ProofGrid from '../components/ProofGrid';
import { App } from '../utils/AppClass';
import { Platform } from 'react-native';
import Clipboard from '@react-native-community/clipboard';
import { blueColor, borderColor, componentBgColor, textColor1, textColor2 } from '../utils/colors';
import { useToastController } from '@tamagui/toast';

const { ethers } = require('ethers');
const fileName = "passport.arkzkey"
const path = "/data/user/0/com.proofofpassport/files/" + fileName

interface MintScreenProps {
    selectedApp: App | null;
    step: number;
    mintText: string;
    proof: { proof: string, inputs: string } | null;
    proofTime: number;
    handleMint: () => void;

}

const MintScreen: React.FC<MintScreenProps> = ({
    selectedApp,
    step,
    mintText,
    proof,
    proofTime,
    handleMint,
}) => {
    const toast = useToastController();

    const getTx = (input: string | null): string => {
        if (!input) return '';
        const transaction = input.split(' ').filter(word => word.startsWith('0x')).join(' ');
        return transaction;
    }
    const shortenInput = (input: string | null): string => {
        if (!input) return '';
        if (input.length > 9) {
            return input.substring(0, 25) + '\u2026';
        } else {
            return input;
        }
    }

    const copyToClipboard = (input: string) => {
        Clipboard.setString(input);
        toast.show('🖨️ Tx copied to clipboard', {
            message: "",
            customData: {
                type: "success",
            },
        })

    };


    return (
        <YStack px="$4" f={1} mb={Platform.OS === 'ios' ? "$5" : "$0"}>
            {step === Steps.TX_MINTED ? (
                <YStack flex={1} justifyContent='center' alignItems='center' gap="$5">
                    <XStack flex={1} />
                    <ProofGrid proof={proof} />

                    <YStack gap="$1">
                        <Text color={textColor1} fontWeight="bold" fontSize="$5" >You just have minted a Soulbound token 🎉</Text>
                        <Text color={textColor1} fontSize="$4" fow="bold" textAlign='left'>You can now share this proof with the selected app.</Text>

                        <Text color={textColor1} fontSize="$4" fow="bold" mt="$5">Network: Sepolia</Text>
                        <XStack jc='space-between' h="$2" ai="center">
                            <Text color={textColor1} fontWeight="bold" fontSize="$5">Tx: {shortenInput(getTx(mintText))}</Text>
                        </XStack>
                    </YStack>

                    <XStack flex={1} />
                    <Button borderRadius={100} onPress={() => copyToClipboard(getTx(mintText))} marginTop="$4" mb="$8" backgroundColor="#3185FC">
                        <Copy color="white" size="$1" /><Text color={textColor1} fow="bold" >Copy to clipboard</Text>
                    </Button>

                </YStack>
            ) : (
                <YStack flex={1} justifyContent='center' alignItems='center' gap="$5" pt="$8">
                    <ProofGrid proof={proof} />

                    <YStack mt="$6" >
                        <Text color={textColor1} fontWeight="bold" fontSize="$5" mt="$3">ZK proof generated  🎉</Text>
                        <Text color={textColor2} mt="$1">Proof generation duration: {formatDuration(proofTime)}</Text>

                        <Text color={textColor2} fontSize="$5" mt="$4" textAlign='left'>You can now use this proof to mint a Soulbond token.</Text>
                        <Text color={textColor2} fontSize="$4" mt="$2" textAlign='left'>Disclosed information will be displayed on SBT.</Text>
                    </YStack>
                    <XStack flex={1} />

                    <Button borderColor={borderColor} borderWidth={1.3} disabled={step === Steps.TX_MINTING} borderRadius={100} onPress={handleMint} marginTop="$4" mb="$4" backgroundColor="#0090ff">
                        {step === Steps.TX_MINTING ?
                            <XStack gap="$2">
                                <Spinner />
                                <Text color={textColor1} fow="bold" > Minting </Text>
                            </XStack>
                            : <Text color={textColor1} fow="bold" >{selectedApp?.mintphrase}</Text>}
                    </Button>

                </YStack>
            )}

        </YStack >
    );
};
export default MintScreen;     
