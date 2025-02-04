import React, { useEffect } from 'react';

import { useNavigation } from '@react-navigation/native';
import { Image, Spinner } from 'tamagui';

import Logo from '../images/logo.svg';
import { ExpandableBottomLayout } from '../layouts/ExpandableBottomLayout';
import useUserStore from '../stores/userStore';
import { amber500 } from '../utils/colors';

interface SplashScreenProps {}

const SplashScreen: React.FC<SplashScreenProps> = ({}) => {
  const navigation = useNavigation();
  const { userLoaded, passportData } = useUserStore();

  useEffect(() => {
    if (userLoaded) {
      if (passportData && passportData.dg2Hash) {
        navigation.navigate('Home');
      } else {
        navigation.navigate('Launch');
      }
    }
  }, [userLoaded]);

  return (
    <ExpandableBottomLayout.Layout>
      <ExpandableBottomLayout.TopSection>
        <Image
          source={require('../images/texture.png')}
          style={{
            opacity: 0.1,
            position: 'absolute',
          }}
        />
        <Logo />
        <Spinner width={80} height={80} color={amber500} />
      </ExpandableBottomLayout.TopSection>
    </ExpandableBottomLayout.Layout>
  );
};

export default SplashScreen;
