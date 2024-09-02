import React from 'react';
import { YStack, Text } from 'tamagui';
import { ArrowRight } from '@tamagui/lucide-icons';
import { bgGreen, textBlack } from '../utils/colors';
import CustomButton from '../components/CustomButton';
import useNavigationStore from '../stores/navigationStore';

const StartScreen: React.FC = () => {

    const {
        setSelectedTab
    } = useNavigationStore();

    return (
        <YStack f={1} p="$3">
            <YStack f={1} mt="$12">
                <YStack gap="$0.5" mb="$14">
                    <Text fontSize="$9" >Welcome to OpenPassport 👋</Text>
                    <Text fontSize="$8" mt="$6" color={textBlack}>OpenPassport allows you to scan your passport, and to prove your identity in a
                        <Text fontSize="$8" color={textBlack} style={{ textDecorationLine: 'underline', textDecorationColor: bgGreen }}> secure </Text>way.
                    </Text>
                </YStack>

            </YStack>
            <CustomButton Icon={<ArrowRight />} text="Let's start" onPress={() => {
                setSelectedTab("scan");
            }} />
        </YStack >
    );
};

export default StartScreen;
