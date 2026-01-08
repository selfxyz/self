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
import { useSelfClient } from '@selfxyz/mobile-sdk-alpha';
import {
  black,
  charcoal,
  slate50,
} from '@selfxyz/mobile-sdk-alpha/constants/colors';

import CogHollowIcon from '@/assets/icons/cog_hollow.svg';
import PlusCircleIcon from '@/assets/icons/plus_circle.svg';
import ScanIcon from '@/assets/icons/qr_scan.svg';
import { NavBar } from '@/components/navbar/BaseNavBar';
import { apiBaseUrl } from '@/consts/links';
import { buttonTap } from '@/integrations/haptics';
import { extraYPadding } from '@/utils/styleUtils';

export const HomeNavBar = (props: NativeStackHeaderProps) => {
  const selfClient = useSelfClient();
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
          `${apiBaseUrl}/consume-deferred-linking-token?token=${content}`,
        );
        const result = await response.json();
        if (result.status !== 'success') {
          throw new Error(
            `Failed to consume token: ${result.message || 'Unknown error'}`,
          );
        }
        const selfApp: SelfApp = JSON.parse(result.data.self_app);
        console.log('Consume token selfApp:', selfApp);
        selfClient.getSelfAppState().setSelfApp(selfApp);
        selfClient.getSelfAppState().startAppListener(selfApp.sessionId);
        try {
          Clipboard.setString('');
        } catch {}
        props.navigation.navigate('ProvingScreenRouter');
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
      backgroundColor={slate50}
      barStyle={'dark'}
      padding={8}
      justifyContent="space-between"
      paddingTop={Math.max(insets.top, 15) + extraYPadding}
    >
      <NavBar.LeftAction
        component={
          <XStack alignItems="center">
            <Button
              size={'$3'}
              unstyled
              icon={<ScanIcon width={'24'} height={'100%'} color={charcoal} />}
              onPress={() => {
                buttonTap();
                props.navigation.navigate('QRCodeViewFinder');
              }}
            />
            <Button
              size={'$3'}
              unstyled
              marginTop={10}
              icon={<ClipboardIcon size={24} color={charcoal} />}
              onPress={handleConsumeToken}
            />
          </XStack>
        }
      />
      <NavBar.Title style={{ fontSize: 24, color: black }}>
        {props.options.title}
      </NavBar.Title>
      <NavBar.RightAction
        component={
          <XStack alignItems="center">
            <Button
              size={'$3'}
              unstyled
              icon={
                <PlusCircleIcon width={'24'} height={'100%'} color={charcoal} />
              }
              onPress={() => {
                buttonTap();
                props.navigation.navigate('CountryPicker');
              }}
            />
            <Button
              size={'$3'}
              unstyled
              icon={
                <CogHollowIcon width={'24'} height={'100%'} color={charcoal} />
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
