import React from 'react';

import { YStack } from '@tamagui/stacks';
import { Toast, useToastState } from '@tamagui/toast';

import {
  blueColorLight,
  greenColorLight,
  redColorLight,
  textColor1,
} from '../utils/colors';

export const ToastMessage = () => {
  const toast = useToastState();

  if (!toast || toast.isHandledNatively) {
    return null;
  }

  return (
    <Toast
      bg={
        toast.customData?.type === 'success'
          ? greenColorLight
          : toast.customData?.type === 'error'
          ? redColorLight
          : blueColorLight
      }
      animation="100ms"
      enterStyle={{ y: -20, opacity: 0 }}
      exitStyle={{ y: -20, opacity: 0 }}
      opacity={1}
      x={0}
      key={toast?.id}
      duration={3000}
    >
      <YStack ai="center" jc="center">
        <Toast.Title fow="bold" color={'white'}>
          {toast?.title}
        </Toast.Title>
        <Toast.Description color={textColor1}>
          {toast.message}
        </Toast.Description>
      </YStack>
    </Toast>
  );
};
