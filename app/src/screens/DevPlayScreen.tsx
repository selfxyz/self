import React from 'react';
import {PrimaryButton} from "../components/buttons/PrimaryButton"
import {SecondaryButton} from "../components/buttons/SecondaryButton"
import { Text, XStack, YStack } from 'tamagui';


const DevPlayScreen = () => {

    return (
        <YStack ai="center" f={1} gap="$8" mt="$18" mb="$8">
            <Text fontSize="$9">Hello PASSPORT</Text>
            <PrimaryButton disabled>Primary Button Disabled</PrimaryButton>
            <PrimaryButton>Primary Button</PrimaryButton>
            <SecondaryButton>Secondary Button</SecondaryButton>
        <XStack f={1} />
        </YStack>
    )
};

export default DevPlayScreen;
