import React from 'react';
import { Button } from 'tamagui';
import { bgGreen, textBlack } from '../utils/colors';

interface CustomButtonProps {
    text: string;
    onPress: () => void;
    Icon?: React.ReactNode;
    bgColor?: string;
}

const CustomButton: React.FC<CustomButtonProps> = ({ text, onPress, Icon, bgColor }) => {
    return (
        <Button bg={bgColor ? bgColor : bgGreen} h="$4.5" borderRadius="$10" mx="$3" onPress={onPress}>
            {Icon && <Button.Icon>{Icon}</Button.Icon>}
            <Button.Text fontSize="$5" fontWeight="bold" color={textBlack}>
                {text}
            </Button.Text>
        </Button>
    );
};

export default CustomButton;
