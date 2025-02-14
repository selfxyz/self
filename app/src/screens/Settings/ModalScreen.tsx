import React, { useCallback, useState } from 'react';

import { StaticScreenProps, useNavigation } from '@react-navigation/native';
import { View, XStack, YStack, styled } from 'tamagui';

import { PrimaryButton } from '../../components/buttons/PrimaryButton';
import Description from '../../components/typography/Description';
import { Title } from '../../components/typography/Title';
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

export interface ModalParams extends Record<string, any> {
  titleText: string;
  bodyText: string;
  buttonText: string;
  onButtonPress: (() => Promise<void>) | (() => void);
  onModalDismiss: () => void;
}

interface ModalScreenProps extends StaticScreenProps<ModalParams> {}

const ModalScreen: React.FC<ModalScreenProps> = ({ route: { params } }) => {
  const navigation = useNavigation();
  const [pending, setPending] = useState(false);
  const onButtonPressed = useCallback(async () => {
    setPending(true);
    try {
      await params?.onButtonPress();
      navigation.goBack();
    } finally {
      setPending(false);
    }
  }, []);

  return (
    <ModalBackDrop>
      <View backgroundColor={white} padding={20} borderRadius={10} mx={8}>
        <YStack gap={40}>
          <XStack alignItems="center" justifyContent="space-between">
            <LogoInversed />
            <ModalClose
              onPress={() => {
                navigation.goBack();
                params?.onModalDismiss();
              }}
            />
          </XStack>
          <YStack gap={20}>
            <Title textAlign="left">{params?.titleText}</Title>
            <Description style={{ textAlign: 'left' }}>
              {params?.bodyText}
            </Description>
          </YStack>
          <PrimaryButton onPress={onButtonPressed} disabled={pending}>
            {params?.buttonText}
          </PrimaryButton>
        </YStack>
      </View>
    </ModalBackDrop>
  );
};

export default ModalScreen;
