import { StaticScreenProps, useIsFocused } from '@react-navigation/native';
import LottieView from 'lottie-react-native';
import React, { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Text } from 'tamagui';

import failAnimation from '../../assets/animations/loading/fail.json';
import miscAnimation from '../../assets/animations/loading/misc.json';
import successAnimation from '../../assets/animations/loading/success.json';
import {
  getStateMessage,
  setupNotifications,
} from '../../utils/notifications/notificationService';
import { useProvingStore } from '../../utils/proving/provingMachine';

type LoadingScreenProps = StaticScreenProps<{}>;

const LoadingScreen: React.FC<LoadingScreenProps> = ({}) => {
  const [animationSource, setAnimationSource] = useState<any>(miscAnimation);
  const currentState = useProvingStore(state => state.currentState);
  const fcmToken = useProvingStore(state => state.fcmToken);
  const isFocused = useIsFocused();

  // Initialize notifications when component mounts
  useEffect(() => {
    if (isFocused) {
      const unsubscribe = setupNotifications();
      return () => {
        if (typeof unsubscribe === 'function') {
          unsubscribe();
        }
      };
    }
  }, [isFocused]);

  // Monitor the state of the proving machine
  useEffect(() => {
    if (isFocused) {
      console.log('[LoadingScreen] Current proving state:', currentState);
      console.log('[LoadingScreen] FCM token available:', !!fcmToken);
    }

    if (currentState === 'completed') {
      setAnimationSource(successAnimation);
    } else if (currentState === 'error' || currentState === 'failure') {
      setAnimationSource(failAnimation);
    } else {
      setAnimationSource(miscAnimation);
    }
  }, [currentState, isFocused, fcmToken]);

  // Determine if we should show the "you can close the app" message
  // Show the message after the payload has been sent (when state is proving or later)
  const canCloseApp = ['proving', 'post_proving', 'completed'].includes(
    currentState,
  );

  return (
    <View style={styles.container}>
      <LottieView
        autoPlay
        loop={animationSource === miscAnimation}
        source={animationSource}
        style={styles.animation}
        resizeMode="cover"
        renderMode="HARDWARE"
      />
      <View style={styles.textContainer}>
        <Text mb={'$2'} color="gray" fontSize={14} textAlign="center">
          This operation can take few minutes.
        </Text>
        {!canCloseApp ? (
          <Text color="white" textAlign="center" fontSize={18}>
            Please don't close the app.
          </Text>
        ) : (
          <Text color="white" textAlign="center" fontSize={18}>
            You can now safely close the app.
          </Text>
        )}
        <Text mt={'$5'} color="gray" fontSize={14} textAlign="center">
          {getStateMessage(currentState)}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: 'relative',
  },
  animation: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  textContainer: {
    position: 'absolute',
    bottom: 40,
    left: 0,
    right: 0,
    padding: 16,
  },
});

export default LoadingScreen;
