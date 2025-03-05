import { useFocusEffect, usePreventRemove } from '@react-navigation/native';
import React from 'react';
import { StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button, YStack } from 'tamagui';

import { pressedStyle } from '../components/buttons/pressedStyle';
import { BodyText } from '../components/typography/BodyText';
import { Caption } from '../components/typography/Caption';
import { useAppUpdates } from '../hooks/useAppUpdates';
import useConnectionModal from '../hooks/useConnectionModal';
import useHapticNavigation from '../hooks/useHapticNavigation';
import SelfCard from '../images/card-style-1.svg';
import ScanIcon from '../images/icons/qr_scan.svg';
import WarnIcon from '../images/icons/warning.svg';
import { useSettingStore } from '../stores/settingStore';
import { amber500, black, neutral700, slate800, white } from '../utils/colors';

const HomeScreen: React.FC = () => {
  useConnectionModal();
  const [isNewVersionAvailable, showAppUpdateModal, isModalDismissed] =
    useAppUpdates();

  useFocusEffect(() => {
    if (isNewVersionAvailable && !isModalDismissed) {
      showAppUpdateModal();
    }
  });

  const onScanButtonPress = useHapticNavigation('QRCodeViewFinder');
  // Prevents back navigation
  usePreventRemove(true, () => {});
  const { bottom } = useSafeAreaInsets();
  return (
    <YStack
      bg={black}
      gap={20}
      jc="space-between"
      flex={1}
      paddingHorizontal={20}
      paddingBottom={bottom}
      style={styles.mainContainer}
    >
      <YStack
        ai="center"
        gap={20}
        justifyContent="flex-start"
        style={styles.topSection}
      >
        <SelfCard width="100%" />
        <Caption color={amber500} opacity={0.3} textTransform="uppercase">
          Only visible to you
        </Caption>
        <PrivacyNote />
      </YStack>
      <YStack
        ai="center"
        gap={20}
        justifyContent="flex-end"
        style={styles.bottomSection}
      >
        <Button
          onPress={onScanButtonPress}
          hitSlop={100}
          pressStyle={styles.scanButtonPressStyle}
          style={styles.scanButton}
        >
          <ScanIcon color={amber500} />
        </Button>
        <Caption
          onPress={onScanButtonPress}
          color={amber500}
          textTransform="uppercase"
          backgroundColor={black}
          pressStyle={styles.captionPressStyle}
        >
          Prove your SELF
        </Caption>
      </YStack>
    </YStack>
  );
};

function PrivacyNote(): JSX.Element | null {
  const { hasPrivacyNoteBeenDismissed } = useSettingStore();
  const onDisclaimerPress = useHapticNavigation('Disclaimer');

  if (hasPrivacyNoteBeenDismissed) {
    return null;
  }

  return (
    <YStack
      onPress={onDisclaimerPress}
      pressStyle={pressedStyle}
      style={styles.card}
    >
      <WarnIcon color={white} width={24} height={33} />
      <BodyText color={white} textAlign="center" fontSize={18}>
        A note on protecting your privacy
      </BodyText>
    </YStack>
  );
}

const styles = StyleSheet.create({
  captionPressStyle: {
    backgroundColor: 'transparent',
  },
  scanButton: {
    borderRadius: 20,
    width: 90,
    height: 90,
    borderColor: neutral700,
    borderWidth: 1,
    backgroundColor: '#1D1D1D',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scanButtonPressStyle: {
    opacity: 1,
    backgroundColor: 'transparent',
    transform: [{ scale: 0.95 }],
  },
  mainContainer: {
    flex: 1,
    gap: 20,
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    backgroundColor: black,
  },
  topSection: {
    alignItems: 'center',
    gap: 20,
    justifyContent: 'flex-start',
  },
  bottomSection: {
    alignItems: 'center',
    gap: 20,
    justifyContent: 'flex-end',
  },
  card: {
    width: '100%',
    flexGrow: 0,
    backgroundColor: slate800,
    borderRadius: 8,
    gap: 12,
    alignItems: 'center',
    padding: 20,
  },
});

export default HomeScreen;
