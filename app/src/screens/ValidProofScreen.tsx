import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { ExpandableBottomLayout } from '../layouts/ExpandableBottomLayout';
import { PrimaryButton } from '../components/buttons/PrimaryButton';
import Description from '../components/typography/Description';
import { typography } from '../components/typography/styles';
import LargeTitle from '../components/typography/LargeTitle';
import { useNavigation } from '@react-navigation/native';

const SuccessScreen: React.FC = () => {
  const navigation = useNavigation();

  return (
    <ExpandableBottomLayout.Layout>
      <ExpandableBottomLayout.TopSection>
        <></>
        {/* TODO Animation */}
      </ExpandableBottomLayout.TopSection>
      <ExpandableBottomLayout.BottomSection>
        <View style={styles.content}>
          <LargeTitle>Identity Verified</LargeTitle>
          <Description>
            You've successfully proved your identity to{' '}
            <Text style={typography.strong}>.SWOOSH</Text>
          </Description>
        </View>
        <PrimaryButton
          onPress={() => {
            navigation.navigate('WrongProofScreen');
          }}
        >
          {' '}
          OK{' '}
        </PrimaryButton>
      </ExpandableBottomLayout.BottomSection>
    </ExpandableBottomLayout.Layout>
  );
};

export default SuccessScreen;

export const styles = StyleSheet.create({
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
