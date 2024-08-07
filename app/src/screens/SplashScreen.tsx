import React, { useEffect } from 'react';
import useUserStore from '../stores/userStore';
import useNavigationStore from '../stores/navigationStore';
import { YStack, Text, Spinner, XStack } from 'tamagui';
import { bgGreen, textBlack } from '../utils/colors';

const SplashScreen = () => {
    const { userLoaded, registered } = useUserStore();
    const { setSelectedTab } = useNavigationStore();

    // once registered is retrieved from zustand, navigate to the appropriate screen
    useEffect(() => {
        if (userLoaded) {
            if (registered) {
                setSelectedTab('app');
            } else {
                setSelectedTab('start');
            }
        }
    }, [userLoaded]);
    return (
        <YStack ai="center" f={1} gap="$8" mt="$18" mb="$8">
            <Text fontSize="$9">Proof of Passport</Text>
            <XStack f={1} />
            <Spinner color={textBlack} />
        </YStack>
    );
};


export default SplashScreen;
