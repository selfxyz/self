import React from 'react';
import { Button, Text } from 'tamagui';
import { bgBlue, bgGreen, textBlack } from '../utils/colors';
import useNavigationStore from '../stores/navigationStore';

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

const CustomButton: React.FC<CustomButtonProps> = ({ text, onPress, Icon, bgColor, h, isDisabled, disabledOnPress, blueVariant }) => {
    const {
        toast,
    } = useNavigationStore();
    return (
        <Button bg={bgColor ? bgColor : blueVariant ? bgBlue : bgGreen} h={blueVariant ? "$8" : "$4.5"} borderRadius="$10" mx="$3" onPress={isDisabled ? disabledOnPress : onPress}>
            {Icon && <Button.Icon>{Icon}</Button.Icon>}
            <Text textAlign='center' fontSize={blueVariant ? "$6" : "$5"} fontWeight="bold" color={textBlack}>
                {text}
            </Text>
        </Button>
    );
};


export default CustomButton;