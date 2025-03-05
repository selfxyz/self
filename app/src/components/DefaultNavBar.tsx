import { NativeStackHeaderProps } from '@react-navigation/native-stack';
import React, { ReactElement, useCallback } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { TextStyle, ViewStyle } from 'tamagui';

import { white } from '../utils/colors';
import { buttonTap } from '../utils/haptic';
import { NavBar } from './NavBar';

const DefaultNavBar = (props: NativeStackHeaderProps): ReactElement => {
  const { goBack, canGoBack } = props.navigation;
  const { options } = props;
  const headerStyle = (options.headerStyle || {}) as ViewStyle;
  const insets = useSafeAreaInsets();

  const handleGoBack = useCallback((): void => {
    buttonTap();
    goBack();
  }, [goBack]);

  return (
    <NavBar.Container
      gap={14}
      paddingHorizontal={20}
      paddingTop={Math.max(insets.top, 12)}
      paddingBottom={20}
      backgroundColor={headerStyle.backgroundColor as string}
      barStyle={
        options.headerTintColor === white ||
        (options.headerTitleStyle as TextStyle).color === white
          ? 'light-content'
          : 'dark-content'
      }
    >
      <NavBar.LeftAction
        component={
          options.headerBackTitle || (canGoBack() ? 'back' : undefined)
        }
        onPress={handleGoBack}
        {...(options.headerTitleStyle as ViewStyle)}
      />
      <NavBar.Title {...(options.headerTitleStyle as ViewStyle)}>
        {props.options.title}
      </NavBar.Title>
    </NavBar.Container>
  );
};

export default DefaultNavBar;
