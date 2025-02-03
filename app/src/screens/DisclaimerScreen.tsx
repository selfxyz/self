import React from 'react';
import { StyleSheet } from 'react-native';

import { useNavigation } from '@react-navigation/native';
import { Image, Text, YStack } from 'tamagui';

import { PrimaryButton } from '../components/buttons/PrimaryButton';
import Warning from '../images/icons/warning.svg';
import { ExpandableBottomLayout } from '../layouts/ExpandableBottomLayout';
import { amber50, amber500, slate700, yellow500 } from '../utils/colors';

const DisclaimerScreen: React.FC = () => {
  const navigation = useNavigation();

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
        <YStack gap="$2.5">
          <Warning
            height={63}
            width={69}
            color={yellow500}
            style={{ margin: 'auto' }}
          />
          <Text style={styles.header}>Be Cautious</Text>
          <Text style={styles.subheader}>Protecting your privacy</Text>
        </YStack>
      </ExpandableBottomLayout.TopSection>
      <ExpandableBottomLayout.BottomSection>
        <YStack gap="$2.5">
          <Text style={styles.disclaimer}>
            Apps that request sensitive or personally identifiable information
            (like passwords, Social Security numbers, or financial details)
            should be trusted only if they're secure and necessary.
          </Text>
          <Text style={{ ...styles.disclaimer, marginTop: 10 }}>
            Always verify an app's legitimacy before sharing your data.
          </Text>
          <PrimaryButton
            style={{ marginVertical: 30 }}
            onPress={() => navigation.navigate('Home')}
          >
            Dismiss
          </PrimaryButton>
        </YStack>
      </ExpandableBottomLayout.BottomSection>
    </ExpandableBottomLayout.Layout>
  );
};

export default DisclaimerScreen;

const styles = StyleSheet.create({
  header: {
    color: amber50,
    fontFamily: 'Advercase-Regular',
    fontSize: 48,
    letterSpacing: 1,
    textAlign: 'center',
  },
  subheader: {
    color: amber500,
    fontFamily: 'DINOT-Medium',
    fontSize: 15,
    fontWeight: '500',
    lineHeight: 18,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    textAlign: 'center',
  },
  disclaimer: {
    color: slate700,
    fontFamily: 'DINOT-Medium',
    fontSize: 18,
    fontWeight: '500',
  },
});
