import React from 'react';
import { Text, YStack, XStack, Card, H3, Image } from 'tamagui';
import { ChevronRight } from '@tamagui/lucide-icons';

interface AppCardProps {
    title: string;
    description: string;
    colorOfTheText: string;
    background: string | undefined;
    id: string | number;
    onTouchStart?: () => void;
    eleva?: string;
}

const AppCard: React.FC<AppCardProps> = ({
    title,
    description,
    colorOfTheText,
    background,
    id,
    onTouchStart,
    eleva
}) => {
    return (
        <Card
            key={id}
            borderRadius="$10"
            elevation={eleva}
            onTouchStart={onTouchStart}
            shadowColor="black"
        >
            <XStack
            >
                <Card.Header w="100%">
                    <XStack w="100%" ai="center" py="$1" >
                        <YStack>
                            <H3 color={colorOfTheText} selectable={false} >{title}</H3>
                            <Text theme="alt2" color={colorOfTheText} selectable={false}>{description}</Text>
                        </YStack>
                        <XStack flex={1} />
                        <ChevronRight size="$4" color={colorOfTheText} />
                    </XStack>
                </Card.Header>
                {background && (
                    <Card.Background>
                        <Image
                            flex={1}
                            borderRadius="$10"
                            source={{
                                uri: background
                            }}
                        />
                    </Card.Background>
                )}
            </XStack>
        </Card >
    );
}

export default AppCard;
