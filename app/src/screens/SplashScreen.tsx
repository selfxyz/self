import React, { useCallback } from 'react';

import { useNavigation } from '@react-navigation/native';
import LottieView from 'lottie-react-native';

import { ExpandableBottomLayout } from '../layouts/ExpandableBottomLayout';
import useUserStore from '../stores/userStore';

interface SplashScreenProps {}

const SplashScreen: React.FC<SplashScreenProps> = ({}) => {
  const navigation = useNavigation();
  const { userLoaded, passportData } = useUserStore();

  const redirect = useCallback(() => {
    if (passportData) {
      navigation.navigate('Home');
    } else {
      navigation.navigate('Launch');
    }
  }, [passportData, userLoaded]);

  return (
    <ExpandableBottomLayout.Layout>
      <ExpandableBottomLayout.TopSection>
        <LottieView
          autoPlay
          loop={false}
          source={require('../assets/animations/splash.json')}
          style={{
            width: '115%',
            height: '115%',
          }}
          onAnimationFinish={redirect}
        />
      </ExpandableBottomLayout.TopSection>
    </ExpandableBottomLayout.Layout>
  );
};

export default SplashScreen;
