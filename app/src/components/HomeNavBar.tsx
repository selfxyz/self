import { NativeStackHeaderProps } from '@react-navigation/native-stack';
import React, { ReactElement, useCallback, useMemo } from 'react';
import { StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button } from 'tamagui';

import ActivityIcon from '../images/icons/activity.svg';
import SettingsIcon from '../images/icons/settings.svg';
import { black, neutral400, white } from '../utils/colors';
import { buttonTap } from '../utils/haptic';
import { NavBar } from './NavBar';

const HomeNavBar = (props: NativeStackHeaderProps): ReactElement => {
  const insets = useSafeAreaInsets();

  const handleActivityPress = useCallback(() => {
    buttonTap();
    // props.navigation.navigate('Activity');
    return false;
  }, []);

  const handleSettingsPress = useCallback(() => {
    buttonTap();
    props.navigation.navigate('Settings');
  }, [props.navigation]);

  const ActivityIconMemo = useMemo(
    () => <ActivityIcon width="24" height="100%" color={neutral400} />,
    [],
  );

  const SettingsIconMemo = useMemo(
    () => <SettingsIcon width="24" height="100%" color={neutral400} />,
    [],
  );

  const ActivityButton = useMemo(
    () => <Button size="$3" unstyled icon={ActivityIconMemo} />,
    [ActivityIconMemo],
  );

  const SettingsButton = useMemo(
    () => <Button size="$3" unstyled icon={SettingsIconMemo} />,
    [SettingsIconMemo],
  );

  // Memoize the dynamic container style
  const containerStyle = useMemo(
    () => [styles.container, { paddingTop: Math.max(insets.top, 20) }],
    [insets.top],
  );

  return (
    <NavBar.Container
      backgroundColor={black}
      barStyle="light-content"
      padding={16}
      justifyContent="space-between"
      style={containerStyle}
    >
      <NavBar.LeftAction
        component={ActivityButton}
        onPress={handleActivityPress}
        style={styles.leftAction}
      />
      <NavBar.Title size="large" color={white}>
        {props.options.title}
      </NavBar.Title>
      <NavBar.RightAction
        component={SettingsButton}
        onPress={handleSettingsPress}
      />
    </NavBar.Container>
  );
};

const styles = StyleSheet.create({
  container: {
    // Base styles for container
  },
  leftAction: {
    opacity: 0,
  },
});

export default HomeNavBar;
