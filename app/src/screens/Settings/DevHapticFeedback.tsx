import React from 'react';
import { StyleSheet } from 'react-native';
import { Button, ScrollView, styled } from 'tamagui';

import {
  feedbackProgress,
  feedbackSuccess,
  feedbackUnsuccessful,
  impactLight,
  impactMedium,
  notificationError,
  notificationSuccess,
  notificationWarning,
  selectionChange,
} from '../../utils/haptic';

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
});

const DevHapticFeedback = () => {
  return (
    <ScrollView style={styles.container}>
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
