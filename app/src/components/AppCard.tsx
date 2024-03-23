import React from 'react';
import { Text, YStack, XStack, Card, H3, Image } from 'tamagui';
import { ChevronRight } from '@tamagui/lucide-icons';
import { Platform } from 'react-native';
import Toast from 'react-native-toast-message';


interface AppCardProps {
    title: string;
    description: string;
    colorOfTheText: string;
    background: string | undefined;
    id: string | number;
    onTouchStart?: () => void;
    selected?: boolean;
    selectable?: boolean;
}

const AppCard: React.FC<AppCardProps> = ({
    title,
    description,
    colorOfTheText,
    background,
    id,
    onTouchStart,
    selected,
    selectable
}) => {
    const showtoast = () => {
        Toast.show({
            type: 'info',
            text1: '🚧 App not available yet '
        })
    }

    return (
        <XStack
            overflow="hidden"
            elevation={selected ? "$3" : "$3"}
            borderRadius="$11"
            borderColor={(selected) ? "#3185FC" : ((Platform.OS === 'ios') ? "white" : "transparent")}
            borderWidth={(selected) ? 3 : 3}
            shadowColor={selected ? "#3185FC" : "black"}
        >
            <Card
                key={id}
                elevation={0}
                onTouchStart={selectable ? onTouchStart : showtoast}
            >
                <XStack w="100%"
                >
                    <Card.Header w="100%">
                        <XStack ai="center" py="$1">
                            <YStack width={250}>
                                <H3 color={colorOfTheText} selectable={false} >{title}</H3>
                                <Text mt="$1" theme="alt2" color={colorOfTheText} selectable={false}>{description}</Text>
                            </YStack>
                            <XStack flex={1} />
                            <ChevronRight size="$4" color={selected ? "#3185FC" : "transparent"} minWidth="$4" />
                        </XStack>
                    </Card.Header>
                    {(
                        <Card.Background
                        >
                            {background &&
                                <Image
                                    flex={1}
                                    source={{
                                        uri: background
                                    }}
                                />}
                        </Card.Background>
                    )}
                </XStack>
            </Card >
        </XStack>
    );
}

export default AppCard;
