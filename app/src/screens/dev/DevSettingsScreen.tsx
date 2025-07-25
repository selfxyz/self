// SPDX-License-Identifier: BUSL-1.1; Copyright (c) 2025 Social Connect Labs, Inc.; Licensed under BUSL-1.1 (see LICENSE); Apache-2.0 from 2029-06-11

import { useNavigation } from '@react-navigation/native';
import { Check, ChevronDown, Eraser } from '@tamagui/lucide-icons';
import React, {
  PropsWithChildren,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { Alert, Platform, StyleProp, TextInput } from 'react-native';
import { Adapt, Button, Select, Sheet, Text, XStack, YStack } from 'tamagui';

import { RootStackParamList } from '../../navigation';
import {
  unsafe_clearSecrets,
  unsafe_getPrivateKey,
} from '../../providers/authProvider';
import { usePassport } from '../../providers/passportDataProvider';
import { textBlack } from '../../utils/colors';
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
  style?: StyleProp<any>;
}

function SelectableText({ children, ...props }: DevSettingsScreenProps) {
  if (Platform.OS === 'ios') {
    return (
      <TextInput multiline editable={false} {...props}>
        {children}
      </TextInput>
    );
  } else {
    return (
      <Text selectable {...props}>
        {children}
      </Text>
    );
  }
}

const items = [
  'DevSettings',
  'DevFeatureFlags',
  'DevHapticFeedback',
  'Splash',
  'Launch',
  'PassportOnboarding',
  'PassportCamera',
  'PassportNFCScan',
  'PassportDataInfo',
  'LoadingScreen',
  'AccountVerifiedSuccess',
  'ConfirmBelongingScreen',
  'CreateMock',
  'Home',
  'Disclaimer',
  'QRCodeViewFinder',
  'ProveScreen',
  'ProofRequestStatusScreen',
  'Settings',
  'AccountRecovery',
  'SaveRecoveryPhrase',
  'RecoverWithPhrase',
  'ShowRecoveryPhrase',
  'CloudBackupSettings',
  'UnsupportedPassport',
  'PassportCameraTrouble',
  'PassportNFCTrouble',
] satisfies (keyof RootStackParamList)[];

const ScreenSelector = ({}) => {
  const navigation = useNavigation();
  return (
    <Select
      onValueChange={(screen: any) => {
        navigation.navigate(screen);
      }}
      disablePreventBodyScroll
    >
      <Select.Trigger width={220} iconAfter={ChevronDown}>
        <Select.Value placeholder="Select screen to jump to" />
      </Select.Trigger>

      <Adapt when={'sm' as any} platform="touch">
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
  const [privateKey, setPrivateKey] = useState<string | null>(
    'Loading private key…',
  );
  const [isPrivateKeyRevealed, setIsPrivateKeyRevealed] = useState(false);

  useEffect(() => {
    unsafe_getPrivateKey().then(key =>
      setPrivateKey(key || 'No private key found'),
    );
  }, []);

  const handleRevealPrivateKey = useCallback(() => {
    setIsPrivateKeyRevealed(true);
  }, []);

  const getRedactedPrivateKey = useCallback(() => {
    if (
      !privateKey ||
      privateKey === 'Loading private key…' ||
      privateKey === 'No private key found'
    ) {
      return privateKey;
    }

    // If it starts with 0x, show 0x followed by asterisks for the rest
    if (privateKey.startsWith('0x')) {
      const restLength = privateKey.length - 2;
      return '0x' + '*'.repeat(restLength);
    }

    // Otherwise, show asterisks for the entire length
    return '*'.repeat(privateKey.length);
  }, [privateKey]);

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
    <YStack
      gap="$3"
      alignItems="center"
      backgroundColor="white"
      flex={1}
      paddingHorizontal="$4"
      paddingTop="$4"
    >
      <YStack
        padding="$4"
        borderWidth={2}
        borderColor="$blue8"
        borderRadius="$4"
        backgroundColor="$blue1"
        width="100%"
        gap="$3"
        marginTop="$3"
      >
        <Text
          color="$blue10"
          fontWeight="bold"
          fontSize="$5"
          textAlign="center"
          marginBottom="$2"
        >
          🚀 Developer Shortcuts
        </Text>
        <YStack alignItems="center" gap="$3">
          <YStack alignItems="center" gap="$3" width="100%">
            <Text
              color={textBlack}
              fontSize="$3"
              textAlign="center"
              opacity={0.7}
            >
              Jump directly to any screen for testing
            </Text>
            <ScreenSelector />
          </YStack>
        </YStack>
      </YStack>
      <YStack
        marginTop="$3"
        marginBottom="$10"
        padding="$4"
        borderWidth={2}
        borderColor="$red8"
        borderRadius="$4"
        backgroundColor="$red1"
        width="100%"
        gap="$3"
      >
        <Text
          color="$red10"
          fontWeight="bold"
          fontSize="$5"
          textAlign="center"
          marginBottom="$2"
        >
          ⚠️ Danger Zone ⚠️
        </Text>

        <YStack alignItems="center" gap="$3">
          {!isPrivateKeyRevealed ? (
            <YStack alignItems="center" gap="$3" width="100%">
              <Text
                color={textBlack}
                textAlign="center"
                style={{
                  fontFamily: 'monospace',
                  fontSize: 12,
                  backgroundColor: 'white',
                  padding: 12,
                  borderRadius: 8,
                  borderWidth: 1,
                  borderColor: '#e0e0e0',
                  wordBreak: 'break-all',
                  lineHeight: 18,
                }}
              >
                {getRedactedPrivateKey()}
              </Text>
              <Button
                backgroundColor="$gray12"
                color="white"
                size="$3"
                marginTop="$2"
                onPress={handleRevealPrivateKey}
              >
                Tap to reveal private key
              </Button>
            </YStack>
          ) : (
            <SelectableText
              textAlign="center"
              color={textBlack}
              userSelect="all"
              style={{
                fontFamily: 'monospace',
                fontWeight: 'bold',
                fontSize: 12,
                backgroundColor: 'white',
                padding: 12,
                borderRadius: 8,
                borderWidth: 1,
                borderColor: '#e0e0e0',
                wordBreak: 'break-all',
                lineHeight: 18,
              }}
            >
              {privateKey}
            </SelectableText>
          )}
        </YStack>

        <YStack alignItems="center" gap="$3" marginTop="$2">
          <XStack alignItems="center" gap="$3">
            <Text color={textBlack} fontSize="$3">
              Delete Private Key
            </Text>
            <Button
              backgroundColor="$red8"
              color="white"
              size="$3"
              onPress={handleClearSecretsPress}
            >
              <Eraser color="white" size={16} />
            </Button>
          </XStack>
          <XStack alignItems="center" gap="$3">
            <Text color={textBlack} fontSize="$3">
              Clear Document Catalog
            </Text>
            <Button
              backgroundColor="$red8"
              color="white"
              size="$3"
              onPress={handleClearDocumentCatalogPress}
            >
              <Eraser color="white" size={16} />
            </Button>
          </XStack>
        </YStack>
      </YStack>
    </YStack>
  );
};

export default DevSettingsScreen;
