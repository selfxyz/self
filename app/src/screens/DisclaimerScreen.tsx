import { useNavigation } from '@react-navigation/native';
import LottieView from 'lottie-react-native';
import React, { useCallback, useEffect } from 'react';
import { StyleSheet } from 'react-native';
import { YStack } from 'tamagui';

import warningAnimation from '../assets/animations/warning.json';
import { PrimaryButton } from '../components/buttons/PrimaryButton';
import Caution from '../components/typography/Caution';
import { SubHeader } from '../components/typography/SubHeader';
import { ExpandableBottomLayout } from '../layouts/ExpandableBottomLayout';
import { useSettingStore } from '../stores/settingStore';
import { black, white } from '../utils/colors';
import { confirmTap, notificationWarning } from '../utils/haptic';

const DisclaimerScreen: React.FC = () => {
  const navigation = useNavigation();
  const { dismissPrivacyNote } = useSettingStore();

  useEffect(() => {
    notificationWarning();
  }, []);

  const handleDismiss = useCallback(() => {
    confirmTap();
    dismissPrivacyNote();
    navigation.navigate('Home');
  }, [dismissPrivacyNote, navigation]);

  return (
    <ExpandableBottomLayout.Layout backgroundColor={black}>
      <ExpandableBottomLayout.TopSection backgroundColor={black}>
        <LottieView
          autoPlay
          loop={false}
          source={warningAnimation}
          style={styles.animation}
          cacheComposition={true}
          renderMode="HARDWARE"
        />
        <YStack f={1} jc="flex-end" pb="$4">
          <SubHeader style={styles.subHeader}>Caution</SubHeader>
        </YStack>
      </ExpandableBottomLayout.TopSection>
      <ExpandableBottomLayout.BottomSection backgroundColor={white}>
        <YStack gap="$2.5">
          <Caution>
            Apps that request sensitive or personally identifiable information
            (like passwords, Social Security numbers, or financial details)
            should be trusted only if they're secure and necessary.
          </Caution>
          <Caution style={styles.secondCaution}>
            Always verify an app's legitimacy before sharing your data.
          </Caution>
          <PrimaryButton style={styles.dismissButton} onPress={handleDismiss}>
            Dismiss
          </PrimaryButton>
        </YStack>
      </ExpandableBottomLayout.BottomSection>
    </ExpandableBottomLayout.Layout>
  );
};

export default DisclaimerScreen;

const styles = StyleSheet.create({
  animation: {
    position: 'absolute',
    width: '125%',
    height: '125%',
  },
  subHeader: {
    color: white,
  },
  secondCaution: {
    marginTop: 10,
  },
  dismissButton: {
    marginVertical: 30,
  },
});
