// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import React from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button, XStack } from 'tamagui';
import Clipboard from '@react-native-clipboard/clipboard';
import type { NativeStackHeaderProps } from '@react-navigation/native-stack';
import { Clipboard as ClipboardIcon } from '@tamagui/lucide-icons';

import type { SelfApp } from '@selfxyz/common/utils/appType';

import { NavBar } from '@/components/NavBar/BaseNavBar';
import ActivityIcon from '@/images/icons/activity.svg';
import SettingsIcon from '@/images/icons/settings.svg';
import { useSelfAppStore } from '@/stores/selfAppStore';
import { black, neutral400, white } from '@/utils/colors';
import { extraYPadding } from '@/utils/constants';
import { buttonTap } from '@/utils/haptic';

export const HomeNavBar = (props: NativeStackHeaderProps) => {
  const insets = useSafeAreaInsets();
  const handleConsumeToken = async () => {
    const content = await Clipboard.getString();
    console.log('Consume token content:', content);
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!content || !uuidRegex.test(content)) {
      console.log('Invalid clipboard content');
      props.navigation.navigate('DeferredLinkingInfo');
      return;
    }
    if (uuidRegex.test(content)) {
      try {
        const response = await fetch(
          `https://api.self.xyz/consume-deferred-linking-token?token=${content}`,
        );
        console.log('Consume token response:', response);
        const result = await response.json();
        console.log('Consume token result:', result);
        if (result.status !== 'success') {
          throw new Error(
            `Failed to consume token: ${result.message || 'Unknown error'}`,
          );
        }
        const selfApp: SelfApp = JSON.parse(result.data.self_app);
        console.log('Consume token selfApp:', selfApp);
        useSelfAppStore.getState().setSelfApp(selfApp);
        useSelfAppStore.getState().startAppListener(selfApp.sessionId);
        try {
          Clipboard.setString('');
        } catch {}
        props.navigation.navigate('ProveScreen');
      } catch (error) {
        console.error('Error consuming token:', error);
        if (
          error instanceof Error &&
          error.message.includes('Token not found or expired')
        ) {
          try {
            Clipboard.setString('');
          } catch {}
          props.navigation.navigate('DeferredLinkingInfo');
        }
      }
    } else {
      console.log('Clipboard content is not a UUID');
    }
  };
  return (
    <NavBar.Container
      backgroundColor={black}
      barStyle={'light'}
      padding={16}
      justifyContent="space-between"
      paddingTop={Math.max(insets.top, 15) + extraYPadding}
    >
      <NavBar.LeftAction
        component={
          <Button
            size={'$3'}
            unstyled
            icon={
              <ActivityIcon width={'24'} height={'100%'} color={neutral400} />
            }
          />
        }
        // disable icon click for now
        onPress={() => {
          buttonTap();
          props.navigation.navigate('ProofHistory');
        }}
      />
      <NavBar.Title size="large" color={white}>
        {props.options.title}
      </NavBar.Title>
      <NavBar.RightAction
        component={
          <XStack alignItems="center" gap={10}>
            <ClipboardIcon
              size={24}
              color={neutral400}
              onPress={handleConsumeToken}
            />
            <Button
              size={'$3'}
              unstyled
              icon={
                <SettingsIcon width={'24'} height={'100%'} color={neutral400} />
              }
              onPress={() => {
                buttonTap();
                props.navigation.navigate('Settings');
              }}
            />
          </XStack>
        }
      />
    </NavBar.Container>
  );
};
