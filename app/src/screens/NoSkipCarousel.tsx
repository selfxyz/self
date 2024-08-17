import React from 'react';
import { YStack, Button, Image, Text, styled } from 'tamagui';
import { Camera, SquarePen, UserPlus } from '@tamagui/lucide-icons';
import { bgColor, borderColor, textBlack, textColor1, textColor2 } from '../utils/colors';
import { Steps } from "../utils/utils";
import CustomButton from '../components/CustomButton';

const NoSkipCarousel: React.FC = () => {
    const textStyle = styled(Text, {
        fontSize: 20,
        fontWeight: 'bold',
        color: textBlack,
    });

    return (
        <YStack f={1} p="$3" bg="white">
            <YStack f={1} jc="center">
                <YStack gap="$0.5" mt="$3.5">
                    <Text fontSize="$9" mt="$1" >Lorem ipsum doflor siat amet</Text>
                    <Text fontSize="$2" mt="$2" color={textBlack}>Lorem ipsum dolor sit amet</Text>
                </YStack>

            </YStack>
            <CustomButton text="Let's start" onPress={() => {
                console.log("Let's start");
            }} />
        </YStack >
    );
};

export default NoSkipCarousel;
