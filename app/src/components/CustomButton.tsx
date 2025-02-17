import { bgBlue, bgGreen, textBlack } from '../utils/colors';
import React from 'react';
import { Button, Text } from 'tamagui';

interface CustomButtonProps {
  text: string;
  onPress: () => void;
  Icon?: React.ReactNode;
  bgColor?: string;
  h?: string;
  isDisabled?: boolean;
  disabledOnPress?: () => void;
  blueVariant?: boolean;
}

const CustomButton: React.FC<CustomButtonProps> = ({
  text,
  onPress,
  Icon,
  bgColor,
  isDisabled,
  disabledOnPress,
  blueVariant,
}) => {
  return (
    <Button
      bg={bgColor ? bgColor : blueVariant ? bgBlue : bgGreen}
      h={blueVariant ? '$8' : '$5'}
      borderRadius="$10"
      onPress={isDisabled ? disabledOnPress : onPress}
    >
      {Icon && <Button.Icon>{Icon}</Button.Icon>}
      <Text
        textAlign="center"
        fontSize={blueVariant ? '$6' : '$5'}
        fontWeight="bold"
        color={textBlack}
      >
        {text}
      </Text>
    </Button>
  );
};

export default CustomButton;
