import React from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { NativeStackHeaderProps } from '@react-navigation/native-stack';
import { Button } from 'tamagui';

import ActivityIcon from '../images/icons/activity.svg';
import SettingsIcon from '../images/icons/settings.svg';
import { black, neutral400, white } from '../utils/colors';
import { NavBar } from './NavBar';

const HomeNavBar = (props: NativeStackHeaderProps) => {
  const insets = useSafeAreaInsets();
  return (
    <NavBar.Container
      backgroundColor={black}
      barStyle={'light-content'}
      padding={16}
      justifyContent="space-between"
      paddingTop={Math.max(insets.top, 20)}
    >
      <NavBar.LeftAction
        component={
          <Button
            size="$3"
            unstyled
            icon={
              <ActivityIcon width={'24'} height={'100%'} color={neutral400} />
            }
          />
        }
        onPress={() => props.navigation.navigate('Activity')}
      />
      <NavBar.Title size="large" color={white}>
        {props.options.title}
      </NavBar.Title>
      <NavBar.RightAction
        component={
          <Button
            size={'$3'}
            unstyled
            icon={
              <SettingsIcon width={'24'} height={'100%'} color={neutral400} />
            }
          />
        }
        onPress={() => props.navigation.navigate('Settings')}
      />
    </NavBar.Container>
  );
};

export default HomeNavBar;
