import React from 'react';
import { StyleSheet, ViewStyle } from 'react-native';
import { Button, Text, ViewProps } from 'tamagui';

import { shouldShowAesopRedesign } from '../../hooks/useAesopRedesign';
import { navigationRef } from '../../navigation';
import analytics from '../../utils/analytics';
import { dinot } from '../../utils/fonts';
import { pressedStyle } from './pressedStyle';

export interface ButtonProps extends ViewProps {
  children: React.ReactNode;
  animatedComponent?: React.ReactNode;
}

interface AbstractButtonProps extends ButtonProps {
  bgColor: string;
  borderColor?: string;
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
  borderColor,
  style,
  animatedComponent,
  ...props
}: AbstractButtonProps) {
  const hasBorder = borderColor ? true : false;
  const { trackEvent } = analytics();

  const handlePress = (e: any) => {
    // Track button press with analytics
    const currentScreen = navigationRef.getCurrentRoute()?.name || 'Unknown';
    trackEvent('Button Press', {
      screen: currentScreen,
      button_text: typeof children === 'string' ? children : 'Unknown',
      button_type: bgColor === 'transparent' ? 'Secondary' : 'Primary',
      disabled: props.disabled || false,
    });

    // Call the original onPress handler if it exists
    if (props.onPress) {
      props.onPress(e);
    }
  };

  return (
    <Button
      unstyled
      {...props}
      onPress={handlePress}
      style={[
        styles.container,
        { backgroundColor: bgColor, borderColor: borderColor },
        hasBorder ? styles.withBorder : {},
        style as ViewStyle,
      ]}
      pressStyle={!animatedComponent ? pressedStyle : {}}
    >
      {animatedComponent}
      <Text style={[styles.text, { color: color }]}>{children}</Text>
    </Button>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    justifyContent: 'center',
    flexDirection: 'row',
    flexGrow: 0,
    flexShrink: 0,
    width: shouldShowAesopRedesign() ? '48%' : '100%',
    display: 'flex',
    alignItems: 'center',
    rowGap: 12,
    padding: 20,
    borderRadius: 5,
  },
  withBorder: {
    borderWidth: 4,
    padding: 16, // plus 4 of border = 20
  },
  text: {
    fontFamily: dinot,
    textAlign: 'center',
    fontSize: 18,
  },
});
