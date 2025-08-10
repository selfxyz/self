// SPDX-License-Identifier: BUSL-1.1; Copyright (c) 2025 Social Connect Labs, Inc.; Licensed under BUSL-1.1 (see LICENSE); Apache-2.0 from 2029-06-11

import React, { useState } from 'react';
import { StyleSheet } from 'react-native';
import { Button, ScrollView, styled } from 'tamagui';

import {
  feedbackProgress,
  feedbackSuccess,
  feedbackUnsuccessful,
  impactLight,
  impactMedium,
  loadingScreenProgress,
  notificationError,
  notificationSuccess,
  notificationWarning,
  selectionChange,
} from '@/utils/haptic';

const StyledButton = styled(Button, {
  width: '75%',
  marginHorizontal: 'auto',
  padding: 10,
  backgroundColor: '#007BFF',
  borderRadius: 10,
  marginVertical: 10,
  color: '#fff',
  fontSize: 16,
  fontWeight: 'bold',
  pointerEvents: 'auto',
  touchAction: 'manipulation',
});

const DevHapticFeedback = () => {
  const [loadingProgressEnabled, setLoadingProgressEnabled] = useState(true);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingTop: 20 }}
      bounces={false}
    >
      <StyledButton
        onPress={() => {
          loadingScreenProgress(loadingProgressEnabled);
          setLoadingProgressEnabled(!loadingProgressEnabled);
        }}
      >
        Loading Screen Progress {loadingProgressEnabled ? '(OFF)' : '(ON)'}
      </StyledButton>
      <StyledButton onPress={feedbackUnsuccessful}>
        Feedback Unsuccessful
      </StyledButton>
      <StyledButton onPress={feedbackSuccess}>Feedback Success</StyledButton>
      <StyledButton onPress={feedbackProgress}>Feedback Progress</StyledButton>
      <StyledButton onPress={notificationError}>
        Notification Error
      </StyledButton>
      <StyledButton onPress={notificationSuccess}>
        Notification Success
      </StyledButton>
      <StyledButton onPress={notificationWarning}>
        Notification Warning
      </StyledButton>
      <StyledButton onPress={impactLight}>Impact Light</StyledButton>
      <StyledButton onPress={impactMedium}>Impact Medium</StyledButton>
      <StyledButton onPress={selectionChange}>Selection Change</StyledButton>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingVertical: 50,
    backgroundColor: '#fff',
  },
});

export default DevHapticFeedback;
