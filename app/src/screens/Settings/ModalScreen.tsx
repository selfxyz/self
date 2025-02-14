import React from 'react';

import { StaticScreenProps } from '@react-navigation/native';
import { View, XStack, YStack, styled } from 'tamagui';

import { PrimaryButton } from '../../components/buttons/PrimaryButton';
import Description from '../../components/typography/Description';
import { Title } from '../../components/typography/Title';
import useHapticNavigation from '../../hooks/useHapticNavigation';
import ModalClose from '../../images/icons/modal_close.svg';
import LogoInversed from '../../images/logo_inversed.svg';
import { white } from '../../utils/colors';

const ModalBackDrop = styled(View, {
  display: 'flex',
  alignItems: 'center',
  // TODO cannot use filter(blur), so increased opacity
  backgroundColor: '#000000BB',
  alignContent: 'center',
  alignSelf: 'center',
  justifyContent: 'center',
  width: '100%',
  height: '100%',
});

const ModalDescription = styled(Description, {
  textAlign: 'left',
});

interface ModalScreenProps
  extends StaticScreenProps<{
    titleText: string;
    bodyText: string;
    buttonText: string;
    onButtonPress: () => void;
    onModalDismiss: () => void;
  }> {}

const ModalScreen: React.FC<ModalScreenProps> = ({ route: { params } }) => {
  const navigateBack = useHapticNavigation('Home', { action: 'cancel' });
  const onButtonPressed = () => {
    params?.onButtonPress();
    navigateBack();
  };

  return (
    <ModalBackDrop>
      <View backgroundColor={white} padding={20} borderRadius={10} mx={8}>
        <YStack gap={40}>
          <XStack alignItems="center" justifyContent="space-between">
            <LogoInversed />
            <ModalClose
              onPress={() => {
                navigateBack();
                params?.onModalDismiss();
              }}
            />
          </XStack>
          <YStack gap={20}>
            <Title textAlign="left">{params?.titleText}</Title>
            <ModalDescription>{params?.bodyText}</ModalDescription>
          </YStack>
          <PrimaryButton onPress={onButtonPressed}>
            {params?.buttonText}
          </PrimaryButton>
        </YStack>
      </View>
    </ModalBackDrop>
  );
};

export default ModalScreen;
