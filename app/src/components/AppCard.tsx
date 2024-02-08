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
        <Card
            key={id}
            elevation={0}
            onTouchStart={onTouchStart}
            bg="transparent"

        >
            <XStack w="100%"
            >
                <Card.Header w="100%">
                    <XStack ai="center" py="$1" >
                        <YStack>
                            <H3 color={colorOfTheText} selectable={false} >{title}</H3>
                            <Text theme="alt2" color={colorOfTheText} selectable={false}>{description}</Text>
                        </YStack>
                        <XStack flex={1} />
                        <ChevronRight size="$4" color={colorOfTheText} />
                    </XStack>
                </Card.Header>
                {(
                    <Card.Background
                        animation="quick"
                        borderColor={(selected) ? "#E0E0E0" : "transparent"}
                        borderWidth={(selected) ? 3 : 0}
                        borderRadius="$10"
                        bg="#F0F0F0"

                    >
                        {background && <Image
                            flex={1}
                            source={{
                                uri: background
                            }}
                        />}
                    </Card.Background>
                )}
            </XStack>
        </Card >
    );
}

export default AppCard;
