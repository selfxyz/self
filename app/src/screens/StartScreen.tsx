import React from 'react';
import { YStack, Button, Image, Text, styled } from 'tamagui';
import { ArrowRight, Camera, SquarePen, UserPlus } from '@tamagui/lucide-icons';
import { bgColor, bgGreen, borderColor, textBlack, textColor1, textColor2 } from '../utils/colors';
import { Steps } from "../utils/utils";
import CustomButton from '../components/CustomButton';
import useNavigationStore from '../stores/navigationStore';

const StartScreen: React.FC = () => {

    const {
        setStep,
        step,
        selectedTab,
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
                    <Text fontSize="$8" mt="$4" color={textBlack} style={{ opacity: 0.7 }}>You can for example prove that you are over 18 yo while staying fully
                        <Text fontSize="$8" color={textBlack} style={{ textDecorationLine: 'underline', textDecorationColor: bgGreen }}> anonymous.</Text>
                    </Text>
                </YStack>

            </YStack>
            <CustomButton Icon={<ArrowRight />} text="Let's start" onPress={() => {
                setSelectedTab("scan");
            }} />
            {/* <Button onPress={() => {
                setSelectedTab("register");
            }}>
                Register
            </Button> */}
        </YStack >
    );
};

export default StartScreen;
