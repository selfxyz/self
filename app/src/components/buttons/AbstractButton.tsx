import React from 'react';
import { Text, StyleSheet, Pressable, PressableProps, ViewStyle } from 'react-native';
import { black, slate200, slate300, white } from '../../utils/colors';

export interface ButtonProps extends PressableProps {
  children: React.ReactNode;
}

interface AbstractButtonProps extends ButtonProps {
  bgColor: string;
  color: string;
}

/*
    Base Button component that can be used to create different types of buttons
    use PrimaryButton and SecondaryButton instead of this component or create a new button component

    @dev If the button isnt filling the space check that its parent is 100% width
*/
export default function AbstractButton({
  children,
  bgColor,
  color,
  style,
  ...pressable
}: AbstractButtonProps) {
  const isDisabled = pressable.disabled;
  const backgroundColor = isDisabled ? white : bgColor;
  const textColor = isDisabled ? slate300 : color;
  const borderColor = isDisabled ? slate200 : backgroundColor;
  return (
    <Pressable
      {...pressable}
      style={[
        styles.container,
        { backgroundColor, borderColor: borderColor, borderWidth: 4 },
        style as ViewStyle,
      ]}
    >
      <Text style={[styles.text, { color: textColor }]}>{children}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    justifyContent: 'center',
    flexDirection: 'column',
    flexGrow: 0,
    flexShrink: 0,
    backgroundColor: black,
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    rowGap: 12,
    padding: 16, // plus 4 of border = 20
    borderRadius: 5,
  },
  text: {
    fontFamily: 'Cochin',
    textAlign: 'center',
    fontSize: 18,
  },
});
