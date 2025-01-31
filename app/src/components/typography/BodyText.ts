import { styled, Text } from 'tamagui';


export const BodyText = styled(Text, {
    fontFamily: 'DINOT-Medium',
    variants: {
        align: {
            center: {
                textAlign: 'center',
            },
        },
    },
});
