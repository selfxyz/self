import React from 'react';

import { XStack } from 'tamagui';

import { textBlack } from '../utils/colors';

interface StepOneStepTwoProps {
  variable: string;
  step1: string;
  step2: string;
}
const StepOneStepTwo = ({ variable, step1, step2 }: StepOneStepTwoProps) => {
  const isVisible = variable === step1 || variable === step2;

  return (
    <XStack px="$6" gap="$3" style={{ opacity: isVisible ? 1 : 0 }}>
      <XStack
        h="$0.25"
        f={1}
        bg={textBlack}
        borderRadius={100}
        style={{ opacity: variable === step1 ? 1 : 0.2 }}
      />
      <XStack
        h="$0.25"
        f={1}
        bg={textBlack}
        borderRadius={100}
        style={{ opacity: variable === step2 ? 1 : 0.2 }}
      />
    </XStack>
  );
};

export default StepOneStepTwo;
