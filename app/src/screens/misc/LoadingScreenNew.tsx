import { StaticScreenProps, useIsFocused } from '@react-navigation/native';
import LottieView from 'lottie-react-native';
import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import failAnimation from '../../assets/animations/loading/fail.json';
import miscAnimation from '../../assets/animations/loading/misc.json';
import successAnimation from '../../assets/animations/loading/success.json';
import CloseWarningIcon from '../../images/icons/close-warning.svg';
import { black, slate400, white, zinc500 } from '../../utils/colors';
import { dinot } from '../../utils/fonts';
import { useProvingStore } from '../../utils/proving/provingMachine';

type LoadingScreenProps = StaticScreenProps<{
  estimatedTime?: string;
}>;

const defaultEstimatedTime = '10 - 30 SECONDS';

const LoadingScreen: React.FC<LoadingScreenProps> = ({ route }) => {
  const [animationSource, setAnimationSource] = useState<any>(miscAnimation);
  const currentState = useProvingStore(state => state.currentState);
  const isFocused = useIsFocused();

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
        <LottieView
          autoPlay
          loop={animationSource === miscAnimation}
          source={animationSource}
          style={styles.animation}
          resizeMode="cover"
          renderMode="HARDWARE"
        />
        <View style={styles.estimatedTimeSection}>
          <Text style={styles.estimatedTimeLabel}>ESTIMATED TIME:</Text>
          <Text style={styles.estimatedTimeValue}>{estimatedTime}</Text>
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
    paddingTop: 32,
    paddingBottom: 24,
    paddingHorizontal: 24,
    alignItems: 'center',
    backgroundColor: '#18181B',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 8,
  },
  animation: {
    width: 120,
    height: 120,
    marginBottom: 24,
  },
  estimatedTimeSection: {
    width: '100%',
    borderTopWidth: 1,
    borderTopColor: '#232329',
    marginTop: 24,
    paddingTop: 12,
    alignItems: 'center',
  },
  estimatedTimeLabel: {
    color: slate400,
    fontSize: 11,
    letterSpacing: 0.44,
    textTransform: 'uppercase',
    fontFamily: dinot,
    marginBottom: 2,
  },
  estimatedTimeValue: {
    color: white,
    fontSize: 13,
    fontWeight: '600',
    fontFamily: dinot,
    letterSpacing: 0.5,
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
