import React, { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import LottieView from 'lottie-react-native';

import { PrimaryButton } from '../../components/buttons/PrimaryButton';
import Description from '../../components/typography/Description';
import { Title } from '../../components/typography/Title';
import { typography } from '../../components/typography/styles';
import useHapticNavigation from '../../hooks/useHapticNavigation';
import { ExpandableBottomLayout } from '../../layouts/ExpandableBottomLayout';
import useNavigationStore from '../../stores/navigationStore';
import { notificationSuccess } from '../../utils/haptic';

const SuccessScreen: React.FC = () => {
  const { selectedApp } = useNavigationStore();
  const appName = selectedApp?.appName;
  const onOkPress = useHapticNavigation('Home');

  useEffect(() => {
    notificationSuccess();
  }, []);

  return (
    <ExpandableBottomLayout.Layout>
      <ExpandableBottomLayout.TopSection>
        <LottieView
          autoPlay
          loop={false}
          source={require('../../assets/animations/proof_success.json')}
          style={styles.animation}
          cacheComposition={true}
          renderMode="HARDWARE"
        />
      </ExpandableBottomLayout.TopSection>
      <ExpandableBottomLayout.BottomSection>
        <View style={styles.content}>
          <Title size="large">Identity Verified</Title>
          <Description>
            You've successfully proved your identity to{' '}
            <Text style={typography.strong}>{appName}</Text>
          </Description>
        </View>
        <PrimaryButton onPress={onOkPress}>OK</PrimaryButton>
      </ExpandableBottomLayout.BottomSection>
    </ExpandableBottomLayout.Layout>
  );
};

export default SuccessScreen;

export const styles = StyleSheet.create({
  animation: {
    width: '125%',
    height: '125%',
  },
  content: {
    paddingTop: 40,
    paddingHorizontal: 10,
    paddingBottom: 20,
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    gap: 10,
  },
});
