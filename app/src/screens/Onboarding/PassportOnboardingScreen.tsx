import React from 'react';
import { Image } from 'tamagui';

import Passport from '../../images/passport.png';
import { PrimaryButton } from '../../components/buttons/PrimaryButton';
import { SecondaryButton } from '../../components/buttons/SecondaryButton';
import { ExpandableBottomLayout } from '../../layouts/ExpandableBottomLayout';
import { useNavigation } from '@react-navigation/native';
import Title from '../../components/typography/Title';
import Description from '../../components/typography/Description';
import Additional from '../../components/typography/Additional';
import TextsContainer from '../../components/TextsContainer';
import ButtonsContainer from '../../components/ButtonsContainer';

interface PassportOnboardingScreenProps {}

const PassportOnboardingScreen: React.FC<
  PassportOnboardingScreenProps
> = ({}) => {
  const navigation = useNavigation();

  return (
    <ExpandableBottomLayout.Layout>
      <ExpandableBottomLayout.TopSection>
        <Image
          resizeMethod="auto"
          source={{ uri: Passport }}
          style={{
            width: '90%',
            height: '90%',
            aspectRatio: 0.69,
          }}
        />
      </ExpandableBottomLayout.TopSection>
      <ExpandableBottomLayout.BottomSection>
        <TextsContainer>
          <Title text="Scan your passport" />
          <Description text="Open your passport to the first page to scan it." />
          <Additional text="Self ID will not capture an image of your passport. Our system is only reading the fields." />
        </TextsContainer>
        <ButtonsContainer>
          <PrimaryButton onPress={() => navigation.navigate('PassportCamera')}>
            Open Camera
          </PrimaryButton>
          <SecondaryButton onPress={() => navigation.navigate('Launch')}>
            Cancel
          </SecondaryButton>
        </ButtonsContainer>
      </ExpandableBottomLayout.BottomSection>
    </ExpandableBottomLayout.Layout>
  );
};

export default PassportOnboardingScreen;
