import React from 'react';
import { Text, YStack, XStack, Card, H3, Image } from 'tamagui';
import { ChevronRight } from '@tamagui/lucide-icons';
import { Platform } from 'react-native';


interface AppCardProps {
    title: string;
    description: string;
    colorOfTheText: string;
    background: string | undefined;
    id: string | number;
    onTouchStart?: () => void;
    selected?: boolean;
}

const AppCard: React.FC<AppCardProps> = ({
    title,
    description,
    colorOfTheText,
    background,
    id,
    onTouchStart,
    selected
}) => {
    return (

        <XStack
            overflow="hidden"
            elevation={selected ? "$3" : "$3"}
            borderRadius="$10"
            borderColor={(selected) ? "#3185FC" : ((Platform.OS === 'ios') ? "white" : "transparent")}
            borderWidth={(selected) ? 3 : 3}
            shadowColor={selected ? "#3185FC" : "black"}
            animation="quick"
        >
            <Card
                key={id}
                elevation={0}
                onTouchStart={onTouchStart}
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
                            <ChevronRight size="$4" color={selected ? "#3185FC" : colorOfTheText} minWidth="$4" />
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
