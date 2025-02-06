import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { useNavigation } from '@react-navigation/native';
import LottieView from 'lottie-react-native';

import { PrimaryButton } from '../../components/buttons/PrimaryButton';
import Description from '../../components/typography/Description';
import { Title } from '../../components/typography/Title';
import { typography } from '../../components/typography/styles';
import { ExpandableBottomLayout } from '../../layouts/ExpandableBottomLayout';
import useNavigationStore from '../../stores/navigationStore';

const SuccessScreen: React.FC = () => {
  const navigation = useNavigation();
  const { selectedApp } = useNavigationStore();
  const appName = selectedApp?.appName;
  return (
    <ExpandableBottomLayout.Layout>
      <ExpandableBottomLayout.TopSection>
        <LottieView
          autoPlay
          loop={false}
          source={require('../../assets/animations/proof_success.json')}
          style={{
            width: '125%',
            height: '125%',
          }}
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
        <PrimaryButton
          onPress={() => {
            navigation.navigate('Home');
          }}
        >
          OK
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
