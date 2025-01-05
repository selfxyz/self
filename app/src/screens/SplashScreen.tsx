import React, { useEffect } from 'react';

import { Spinner, Text, XStack, YStack } from 'tamagui';

import useNavigationStore from '../stores/navigationStore';
import useUserStore from '../stores/userStore';
import { textBlack } from '../utils/colors';

const SplashScreen = () => {
  const { userLoaded, passportData } = useUserStore();
  const { setSelectedTab } = useNavigationStore();
  useEffect(() => {
    if (userLoaded) {
      if (passportData && passportData.dg2Hash && !passportData.mockUser) {
        setSelectedTab('app');
      } else {
        setSelectedTab('start');
      }
    }
  }, [userLoaded]); // eslint-disable-line
  return (
    <YStack ai="center" f={1} gap="$8" mt="$18" mb="$8">
      <Text fontSize="$9">OpenPassport</Text>
      <XStack f={1} />
      <Spinner color={textBlack} />
    </YStack>
  );
};

export default SplashScreen;
