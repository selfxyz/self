import React from 'react';
import { Text, StyleSheet, Pressable, PressableProps } from 'react-native';
import { black, blueColor, redColorDark, slate200, slate300, white } from '../../utils/colors';


export interface ButtonProps extends PressableProps {
    children: React.ReactNode
}

interface AbstractButtonProps extends ButtonProps {
    bgColor: string
    color: string
}


export default function AbstractButton({children, bgColor, color, ...pressable}: AbstractButtonProps) {
    const isDisabled = pressable.disabled
    const backgroundColor = isDisabled ? white : bgColor
    const textColor = isDisabled ?  slate200 : color
    const borderColor = isDisabled ? slate300 : undefined
    return (
        <Pressable {...pressable} style={[styles.container, {backgroundColor, borderColor: borderColor, borderWidth: 4}]}>
            <Text style={[styles.getStarted, {color: textColor}]}>
                {children}
            </Text>
        </Pressable>
    );
}

const styles = StyleSheet.create({
    container: {
        position: "relative",
        alignSelf: "stretch",
        flexShrink: 0,
        backgroundColor: black,
        maxWidth: 354,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        rowGap: 26,
        padding: 20,
        borderRadius: 5
    },
    getStarted: {
        fontFamily: 'Cochin',
        textAlign: 'center',
        color: 'white',
        fontSize: 18,
    }
});