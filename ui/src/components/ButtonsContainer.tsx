import React from 'react';
import { Stack, StackProps } from 'tamagui';

import { shouldShowAesopRedesign } from '../utils/showAesopRedesign';

type ButtonsContainerProps = StackProps;

const ButtonsContainer = ({ children, ...props }: ButtonsContainerProps) => {
  return (
    <Stack
      flexDirection={shouldShowAesopRedesign() ? 'row' : 'column'}
      justifyContent="center"
      alignItems="center"
      gap={10}
      {...props}
    >
      {children}
    </Stack>
  );
};

export default ButtonsContainer;
