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

        <XStack
            overflow="hidden"

            borderColor={(selected) ? "#E0E0E0" : "white"}
            borderWidth={(selected) ? 6 : 6}
            borderRadius="$10">
            <Card
                key={id}
                elevation={0}
                onTouchStart={onTouchStart}

            >
                <XStack w="100%"
                >
                    <Card.Header w="100%">
                        <XStack ai="center" py="$1" >
                            <YStack width={235}>
                                <H3 color={colorOfTheText} selectable={false} >{title}</H3>
                                <Text theme="alt2" color={colorOfTheText} selectable={false}>{description}</Text>
                            </YStack>
                            <XStack flex={1} />
                            <ChevronRight size="$4" color={colorOfTheText} minWidth="$4" />
                        </XStack>
                    </Card.Header>
                    {(
                        <Card.Background

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
        </XStack>
    );
}

export default AppCard;
