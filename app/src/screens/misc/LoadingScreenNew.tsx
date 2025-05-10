import { StaticScreenProps, useIsFocused } from '@react-navigation/native';
import LottieView from 'lottie-react-native';
import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import failAnimation from '../../assets/animations/loading/fail.json';
import miscAnimation from '../../assets/animations/loading/misc-new.json';
import successAnimation from '../../assets/animations/loading/success.json';
import CloseWarningIcon from '../../images/icons/close-warning.svg';
import { black, slate400, white, zinc500, zinc900 } from '../../utils/colors';
import { advercase, dinot } from '../../utils/fonts';
import { useProvingStore } from '../../utils/proving/provingMachine';

type LoadingScreenProps = StaticScreenProps<{
  actionText?: string;
  estimatedTime?: string;
}>;

const defaultActionText = 'Registering your ID';
const defaultEstimatedTime = '10 - 30 SECONDS';

const LoadingScreen: React.FC<LoadingScreenProps> = ({ route }) => {
  const [animationSource, setAnimationSource] = useState<any>(miscAnimation);
  const currentState = useProvingStore(state => state.currentState);
  const isFocused = useIsFocused();

  const actionText = route?.params?.actionText ?? defaultActionText;
  const estimatedTime = route?.params?.estimatedTime ?? defaultEstimatedTime;

  // Monitor the state of the proving machine
  useEffect(() => {
    if (isFocused) {
      console.log('[LoadingScreen] Current proving state:', currentState);
    }

    if (currentState === 'completed') {
      setAnimationSource(successAnimation);
    } else if (currentState === 'error' || currentState === 'failure') {
      setAnimationSource(failAnimation);
    } else {
      setAnimationSource(miscAnimation);
    }
  }, [currentState, isFocused]);

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <View style={styles.animationAndTitleGroup}>
          <LottieView
            autoPlay
            loop={animationSource === miscAnimation}
            source={animationSource}
            style={styles.animation}
            resizeMode="cover"
            renderMode="HARDWARE"
          />
          <Text style={styles.title}>{actionText}</Text>
        </View>
        <View style={styles.estimatedTimeSection}>
          <View style={styles.estimatedTimeBorder} />
          <View style={styles.estimatedTimeRow}>
            <Text style={styles.estimatedTimeLabel}>ESTIMATED TIME:</Text>
            <Text style={styles.estimatedTimeValue}>{estimatedTime}</Text>
          </View>
        </View>
      </View>
      <View style={styles.warningSection}>
        <CloseWarningIcon color={zinc500} height={40} />
        <Text style={styles.warningText}>
          Closing the app will cancel this process
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: 'relative',
    backgroundColor: black,
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    width: '92%',
    borderRadius: 16,
    paddingVertical: 20,
    alignItems: 'center',
    backgroundColor: zinc900,
    shadowColor: black,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 8,
  },
  title: {
    color: white,
    fontSize: 24,
    fontFamily: advercase,
    textAlign: 'center',
    letterSpacing: 1,
    fontWeight: '100',
  },
  animation: {
    width: 120,
    height: 120,
    marginBottom: 0,
  },
  animationAndTitleGroup: {
    alignItems: 'center',
    marginBottom: 30,
  },
  estimatedTimeSection: {
    width: '100%',
    alignItems: 'center',
  },
  estimatedTimeBorder: {
    width: '100%',
    height: 1,
    backgroundColor: '#232329',
  },
  estimatedTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    textTransform: 'uppercase',
    marginTop: 16,
  },
  estimatedTimeLabel: {
    color: slate400,
    marginRight: 8,
    fontSize: 11,
    letterSpacing: 0.44,
    fontFamily: dinot,
  },
  estimatedTimeValue: {
    color: white,
    fontSize: 11,
    letterSpacing: 0.44,
    fontFamily: dinot,
  },
  warningSection: {
    position: 'absolute',
    bottom: 40,
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  warningText: {
    color: slate400,
    fontSize: 11,
    paddingTop: 16,
    letterSpacing: 0.44,
    textTransform: 'uppercase',
    fontFamily: dinot,
    textAlign: 'center',
  },
});

export default LoadingScreen;
