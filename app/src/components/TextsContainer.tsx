import React from 'react';
import { Stack, StackProps } from 'tamagui';

interface TextsContainerProps extends Omit<StackProps, 'children'> {
  children: React.ReactNode;
}

const TextsContainer = ({ children, ...props }: TextsContainerProps) => {
  return (
    <Stack
      flexDirection="column"
      justifyContent="center"
      alignItems="center"
      marginBottom={20}
      space={10}
      {...props}
    >
      {children}
    </Stack>
  );
};

export default TextsContainer;
