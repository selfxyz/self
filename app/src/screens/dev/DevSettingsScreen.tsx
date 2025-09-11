// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import type { PropsWithChildren } from 'react';
import React, { cloneElement, isValidElement, useMemo, useState } from 'react';
import type { StyleProp, TextStyle, ViewStyle } from 'react-native';
import { Alert, ScrollView } from 'react-native';
import { Adapt, Button, Select, Sheet, Text, XStack, YStack } from 'tamagui';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Check, ChevronDown, ChevronRight } from '@tamagui/lucide-icons';

import BugIcon from '@/images/icons/bug_icon.svg';
import IdIcon from '@/images/icons/id_icon.svg';
import WarningIcon from '@/images/icons/warning.svg';
import type { RootStackParamList } from '@/navigation';
import { unsafe_clearSecrets } from '@/providers/authProvider';
import { usePassport } from '@/providers/passportDataProvider';
import {
  red500,
  slate100,
  slate200,
  slate400,
  slate500,
  slate600,
  slate800,
  slate900,
  white,
  yellow500,
} from '@/utils/colors';
import { dinot } from '@/utils/fonts';

interface DevSettingsScreenProps extends PropsWithChildren {
  color?: string;
  width?: number;
  justifyContent?:
    | 'center'
    | 'unset'
    | 'flex-start'
    | 'flex-end'
    | 'space-between'
    | 'space-around'
    | 'space-evenly';
  userSelect?: 'all' | 'text' | 'none' | 'contain';
  textAlign?: 'center' | 'left' | 'right';
  style?: StyleProp<TextStyle | ViewStyle>;
}

function ParameterSection({
  icon,
  title,
  description,
  darkMode,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  darkMode?: boolean;
  children: React.ReactNode;
}) {
  const renderIcon = () => {
    const iconElement =
      typeof icon === 'function'
        ? (icon as () => React.ReactNode)()
        : isValidElement(icon)
          ? icon
          : null;

    return iconElement
      ? cloneElement(iconElement as React.ReactElement, {
          width: '100%',
          height: '100%',
        })
      : null;
  };

  return (
    <YStack
      width="100%"
      backgroundColor={darkMode ? slate900 : slate100}
      borderRadius="$4"
      borderWidth={1}
      borderColor={darkMode ? slate800 : slate200}
      padding="$4"
      flexDirection="column"
      gap="$3"
    >
      <XStack
        width="100%"
        flexDirection="row"
        justifyContent="flex-start"
        gap="$4"
      >
        <YStack
          backgroundColor="gray"
          borderRadius={5}
          width={46}
          height={46}
          justifyContent="center"
          alignItems="center"
          padding="$2"
        >
          {renderIcon()}
        </YStack>
        <YStack flexDirection="column" gap="$1">
          <Text
            fontSize="$5"
            color={darkMode ? white : slate600}
            fontFamily={dinot}
          >
            {title}
          </Text>
          <Text fontSize="$3" color={slate400} fontFamily={dinot}>
            {description}
          </Text>
        </YStack>
      </XStack>
      {children}
    </YStack>
  );
}

const items = [
  'DevSettings',
  'DevFeatureFlags',
  'DevHapticFeedback',
  'DevPrivateKey',
  'Splash',
  'Launch',
  'DocumentOnboarding',
  'DocumentCamera',
  'DocumentNFCScan',
  'DocumentDataInfo',
  'Loading',
  'AccountVerifiedSuccess',
  'ConfirmBelonging',
  'CreateMock',
  'Home',
  'Disclaimer',
  'QRCodeViewFinder',
  'Prove',
  'ProofRequestStatus',
  'Settings',
  'AccountRecovery',
  'SaveRecoveryPhrase',
  'RecoverWithPhrase',
  'ShowRecoveryPhrase',
  'CloudBackupSettings',
  'UnsupportedDocument',
  'DocumentCameraTrouble',
  'DocumentNFCTrouble',
] satisfies (keyof RootStackParamList)[];
const ScreenSelector = ({}) => {
  const navigation = useNavigation();
  const [open, setOpen] = useState(false);
  return (
    <Select
      open={open}
      onOpenChange={setOpen}
      onValueChange={(screen: keyof RootStackParamList) => {
        navigation.navigate(screen as never);
      }}
      disablePreventBodyScroll
    >
      <Select.Trigger asChild>
        <Button
          style={{ backgroundColor: 'white' }}
          borderColor={slate200}
          borderRadius="$2"
          height="$5"
          padding={0}
          onPress={() => setOpen(true)}
        >
          <XStack
            width="100%"
            justifyContent="space-between"
            paddingVertical="$3"
            paddingLeft="$4"
            paddingRight="$1.5"
          >
            <Text fontSize="$5" color={slate500} fontFamily={dinot}>
              Select screen
            </Text>
            <ChevronDown color={slate500} strokeWidth={2.5} />
          </XStack>
        </Button>
      </Select.Trigger>

      <Adapt when={true} platform="touch">
        <Sheet native modal dismissOnSnapToBottom animation="medium">
          <Sheet.Frame>
            <Sheet.ScrollView>
              <Adapt.Contents />
            </Sheet.ScrollView>
          </Sheet.Frame>
          <Sheet.Overlay
            backgroundColor="$shadowColor"
            animation="lazy"
            enterStyle={{ opacity: 0 }}
            exitStyle={{ opacity: 0 }}
          />
        </Sheet>
      </Adapt>

      <Select.Content zIndex={200000}>
        <Select.Viewport minWidth={200}>
          <Select.Group>
            {useMemo(
              () =>
                items.map((item, i) => {
                  return (
                    <Select.Item index={i} key={item} value={item}>
                      <Select.ItemText>{item}</Select.ItemText>
                      <Select.ItemIndicator marginLeft="auto">
                        <Check size={16} />
                      </Select.ItemIndicator>
                    </Select.Item>
                  );
                }),
              [],
            )}
          </Select.Group>
        </Select.Viewport>
      </Select.Content>
    </Select>
  );
};

const DevSettingsScreen: React.FC<DevSettingsScreenProps> = ({}) => {
  const { clearDocumentCatalogForMigrationTesting } = usePassport();
  const navigation =
    useNavigation() as NativeStackScreenProps<RootStackParamList>['navigation'];

  const handleClearSecretsPress = () => {
    Alert.alert(
      'Delete Keychain Secrets',
      "Are you sure you want to remove your keychain secrets?\n\nIf this secret is not backed up, your account will be lost and the ID documents attached to it won't be usable.",
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await unsafe_clearSecrets();
          },
        },
      ],
    );
  };

  const handleClearDocumentCatalogPress = () => {
    Alert.alert(
      'Clear Document Catalog',
      'Are you sure you want to clear the document catalog?\n\nThis will remove all documents from the new storage system but preserve legacy storage for migration testing. You will need to restart the app to test migration.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            await clearDocumentCatalogForMigrationTesting();
          },
        },
      ],
    );
  };

  return (
    <ScrollView showsVerticalScrollIndicator={false}>
      <YStack
        gap="$3"
        alignItems="center"
        backgroundColor="white"
        flex={1}
        paddingHorizontal="$4"
        paddingTop="$4"
      >
        <ParameterSection
          icon={<IdIcon />}
          title="Manage ID Documents"
          description="Register new IDs and generate test IDs"
        >
          {[
            {
              label: 'Manage available IDs',
              onPress: () => {
                navigation.navigate('ManageDocuments');
              },
            },
            {
              label: 'Generate Test ID',
              onPress: () => {
                navigation.navigate('CreateMock');
              },
            },
            {
              label: 'Scan new ID Document',
              onPress: () => {
                navigation.navigate('DocumentOnboarding');
              },
            },
          ].map(({ label, onPress }) => (
            <YStack gap="$2" key={label}>
              <Button
                style={{ backgroundColor: 'white' }}
                borderColor={slate200}
                borderRadius="$2"
                height="$5"
                padding={0}
                onPress={onPress}
              >
                <XStack
                  width="100%"
                  justifyContent="space-between"
                  paddingVertical="$3"
                  paddingLeft="$4"
                  paddingRight="$1.5"
                >
                  <Text fontSize="$5" color={slate500} fontFamily={dinot}>
                    {label}
                  </Text>
                  <ChevronRight color={slate500} strokeWidth={2.5} />
                </XStack>
              </Button>
            </YStack>
          ))}
        </ParameterSection>

        <ParameterSection
          icon={<BugIcon />}
          title="Debug Shortcuts"
          description="Jump directly to any screen for testing"
        >
          <YStack gap="$2">
            <Button
              style={{ backgroundColor: 'white' }}
              borderColor={slate200}
              borderRadius="$2"
              height="$5"
              padding={0}
              onPress={() => {
                navigation.navigate('DevPrivateKey');
              }}
            >
              <XStack
                width="100%"
                justifyContent="space-between"
                paddingVertical="$3"
                paddingLeft="$4"
                paddingRight="$1.5"
              >
                <Text fontSize="$5" color={slate500} fontFamily={dinot}>
                  View Private Key
                </Text>
                <ChevronRight color={slate500} strokeWidth={2.5} />
              </XStack>
            </Button>
            <ScreenSelector />
          </YStack>
        </ParameterSection>

        <ParameterSection
          icon={<WarningIcon color={yellow500} />}
          title="Danger Zone"
          description="These actions are sensitive"
          darkMode={true}
        >
          {[
            {
              label: 'Delete your private key',
              onPress: handleClearSecretsPress,
              dangerTheme: true,
            },
            {
              label: 'Clear document catalog',
              onPress: handleClearDocumentCatalogPress,
              dangerTheme: true,
            },
          ].map(({ label, onPress, dangerTheme }) => (
            <Button
              key={label}
              style={{ backgroundColor: dangerTheme ? red500 : white }}
              borderRadius="$2"
              height="$5"
              onPress={onPress}
              flexDirection="row"
              justifyContent="flex-start"
            >
              <Text
                color={dangerTheme ? white : slate500}
                fontSize="$5"
                fontFamily={dinot}
              >
                {label}
              </Text>
            </Button>
          ))}
        </ParameterSection>
      </YStack>
    </ScrollView>
  );
};

export default DevSettingsScreen;
