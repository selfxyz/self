/* eslint-disable simple-import-sort/imports */
import { useNavigation } from '@react-navigation/native';
import { Check, ChevronDown, Eraser } from '@tamagui/lucide-icons';
import React, {
  PropsWithChildren,
  useEffect,
  useState,
  useCallback,
} from 'react';
import { Platform, StyleProp, TextInput } from 'react-native';
import { Adapt, Button, Select, Sheet, Text, YStack, XStack } from 'tamagui';

import { PassportData } from '@selfxyz/common';
import { RootStackParamList } from '../../navigation';
import {
  unsafe_clearSecrets,
  unsafe_getPrivateKey,
} from '../../stores/authProvider';
import { usePassport } from '../../stores/passportDataProvider';
import useUserStore from '../../stores/userStore';
import { borderColor, textBlack } from '../../utils/colors';

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
        <Select.Value placeholder="Select screen to debug" />
      </Select.Trigger>

      <Adapt when="sm" platform="touch">
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
            {React.useMemo(
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
              [items],
            )}
          </Select.Group>
        </Select.Viewport>
      </Select.Content>
    </Select>
  );
};

const PassportDataSelector = () => {
  const { getAllData, getAvailableTypes, clearSpecificData } = usePassport();
  const {
    selectedDocumentType,
    setSelectedDocumentType,
    clearSelectedDocumentType,
  } = useUserStore();
  const [availableTypes, setAvailableTypes] = useState<string[]>([]);
  const [allPassportData, setAllPassportData] = useState<{
    [service: string]: PassportData;
  }>({});

  useEffect(() => {
    loadPassportDataInfo();
  }, []);

  const loadPassportDataInfo = async () => {
    const types = await getAvailableTypes();
    const data = await getAllData();
    setAvailableTypes(types);
    setAllPassportData(data);
  };

  const handleDocumentTypeChange = (documentType: string) => {
    setSelectedDocumentType(documentType);
  };

  const handleDeleteSpecific = async (documentType: string) => {
    await clearSpecificData(documentType);
    await loadPassportDataInfo();

    // Get remaining types after deletion
    const remainingTypes = await getAvailableTypes();

    if (selectedDocumentType === documentType) {
      if (remainingTypes.length > 0) {
        // Set the first remaining document as selected
        setSelectedDocumentType(remainingTypes[0]);
      } else {
        clearSelectedDocumentType();
      }
    }
  };

  const getDisplayName = (documentType: string): string => {
    switch (documentType) {
      case 'passport':
        return 'Passport';
      case 'mock_passport':
        return 'Mock Passport';
      case 'id_card':
        return 'ID Card';
      case 'mock_id_card':
        return 'Mock ID Card';
      default:
        return documentType;
    }
  };

  const getDocumentInfo = (documentType: string): string => {
    // Map document types to data keys
    const dataKey =
      documentType === 'passport'
        ? 'passportData'
        : documentType === 'mock_passport'
          ? 'mockPassportData'
          : documentType === 'id_card'
            ? 'idCardData'
            : documentType === 'mock_id_card'
              ? 'mockIdCardData'
              : documentType;

    const data = allPassportData[dataKey];

    if (!data) {
      console.log(
        `No data found for documentType: ${documentType}, dataKey: ${dataKey}`,
      );
      return 'Unknown';
    }

    const countryCode = data.passportMetadata?.countryCode || 'Unknown';
    return `${countryCode}`;
  };

  if (availableTypes.length === 0) {
    return (
      <YStack gap="$2" ai="center">
        <Text color={textBlack} fontSize="$4">
          No passport data found
        </Text>
      </YStack>
    );
  }

  return (
    <YStack gap="$3" w="100%">
      <Text
        color={textBlack}
        fontWeight="bold"
        fontSize="$5"
        textAlign="center"
      >
        Available Documents
      </Text>
      {availableTypes.map(type => (
        <YStack
          key={type}
          p="$3"
          borderWidth={1}
          borderColor={selectedDocumentType === type ? textBlack : borderColor}
          borderRadius="$3"
          bg={selectedDocumentType === type ? '$gray2' : 'white'}
          onPress={() => handleDocumentTypeChange(type)}
          pressStyle={{ opacity: 0.8 }}
        >
          <XStack ai="center" jc="space-between" mb="$2">
            <XStack ai="center" gap="$3" flex={1}>
              <Button
                size="$2"
                circular
                bg={selectedDocumentType === type ? textBlack : 'white'}
                borderColor={textBlack}
                borderWidth={1}
                onPress={() => handleDocumentTypeChange(type)}
              >
                {selectedDocumentType === type && (
                  <Check size={12} color="white" />
                )}
              </Button>
              <YStack flex={1}>
                <Text color={textBlack} fontWeight="bold" fontSize="$4">
                  {getDisplayName(type)}
                </Text>
                <Text color={textBlack} fontSize="$3" opacity={0.7}>
                  {getDocumentInfo(type)}
                </Text>
              </YStack>
            </XStack>
            <Button
              bg="white"
              jc="center"
              borderColor={borderColor}
              borderWidth={1}
              size="$3"
              onPress={e => {
                e.stopPropagation();
                handleDeleteSpecific(type);
              }}
            >
              <Eraser color={textBlack} size={16} />
            </Button>
          </XStack>
        </YStack>
      ))}
    </YStack>
  );
};

const DevSettingsScreen: React.FC<DevSettingsScreenProps> = ({}) => {
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

  return (
    <YStack gap="$3" ai="center" bg="white" h="100%" px="$4" pt="$4">
      <PassportDataSelector />

      <YStack
        p="$4"
        borderWidth={2}
        borderColor="$blue8"
        borderRadius="$4"
        bg="$blue1"
        w="100%"
        gap="$3"
        mt="$3"
      >
        <Text
          color="$blue10"
          fontWeight="bold"
          fontSize="$5"
          textAlign="center"
          mb="$2"
        >
          🚀 Developer Shortcuts
        </Text>
        <YStack alignItems="center" gap="$3">
          <YStack alignItems="center" gap="$3" w="100%">
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
        mt="$3"
        p="$4"
        borderWidth={2}
        borderColor="$red8"
        borderRadius="$4"
        bg="$red1"
        w="100%"
        gap="$3"
      >
        <Text
          color="$red10"
          fontWeight="bold"
          fontSize="$5"
          textAlign="center"
          mb="$2"
        >
          ⚠️ Danger Zone ⚠️
        </Text>

        <YStack alignItems="center" gap="$3">
          {!isPrivateKeyRevealed ? (
            <YStack alignItems="center" gap="$3" w="100%">
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
                bg="$gray12"
                color="white"
                size="$3"
                mt="$2"
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

        <YStack alignItems="center" gap="$3" mt="$2">
          <XStack alignItems="center" gap="$3">
            <Text color={textBlack} fontSize="$3">
              Delete all keychain secrets
            </Text>
            <Button
              bg="$red8"
              color="white"
              size="$3"
              onPress={unsafe_clearSecrets}
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
