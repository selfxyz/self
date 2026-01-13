// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import type { PropsWithChildren } from 'react';
import React, {
  cloneElement,
  isValidElement,
  useEffect,
  useMemo,
  useState,
} from 'react';
import type { StyleProp, TextStyle, ViewStyle } from 'react-native';
import { Alert, ScrollView, TouchableOpacity } from 'react-native';
import { Button, Sheet, Text, XStack, YStack } from 'tamagui';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Check, ChevronDown, ChevronRight } from '@tamagui/lucide-icons';

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
} from '@selfxyz/mobile-sdk-alpha/constants/colors';
import { dinot } from '@selfxyz/mobile-sdk-alpha/constants/fonts';
import { useSafeBottomPadding } from '@selfxyz/mobile-sdk-alpha/hooks';

import BugIcon from '@/assets/icons/bug_icon.svg';
import WarningIcon from '@/assets/icons/warning.svg';
import type { RootStackParamList } from '@/navigation';
import { navigationScreens } from '@/navigation';
import { unsafe_clearSecrets } from '@/providers/authProvider';
import { usePassport } from '@/providers/passportDataProvider';
import {
  isNotificationSystemReady,
  requestNotificationPermission,
  subscribeToTopics,
  unsubscribeFromTopics,
} from '@/services/notifications/notificationService';
import { usePointEventStore } from '@/stores/pointEventStore';
import { useSettingStore } from '@/stores/settingStore';
import { IS_DEV_MODE } from '@/utils/devUtils';

interface TopicToggleButtonProps {
  label: string;
  isSubscribed: boolean;
  onToggle: () => void;
}

const TopicToggleButton: React.FC<TopicToggleButtonProps> = ({
  label,
  isSubscribed,
  onToggle,
}) => {
  return (
    <Button
      backgroundColor={isSubscribed ? '$green9' : slate200}
      borderRadius="$2"
      height="$5"
      onPress={onToggle}
      flexDirection="row"
      justifyContent="space-between"
      paddingHorizontal="$4"
      pressStyle={{
        opacity: 0.8,
        scale: 0.98,
      }}
    >
      <Text
        color={isSubscribed ? white : slate600}
        fontSize="$5"
        fontFamily={dinot}
        fontWeight="600"
      >
        {label}
      </Text>
      <Text
        color={isSubscribed ? white : slate400}
        fontSize="$3"
        fontFamily={dinot}
      >
        {isSubscribed ? 'Enabled' : 'Disabled'}
      </Text>
    </Button>
  );
};

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

const ScreenSelector = ({}) => {
  const navigation = useNavigation();
  const [open, setOpen] = useState(false);

  const screenList = useMemo(
    () =>
      (
        Object.keys(navigationScreens) as (keyof typeof navigationScreens)[]
      ).sort(),
    [],
  );

  return (
    <>
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

      <Sheet
        modal
        open={open}
        onOpenChange={setOpen}
        snapPoints={[85]}
        animation="medium"
        dismissOnSnapToBottom
      >
        <Sheet.Overlay />
        <Sheet.Frame
          backgroundColor={white}
          borderTopLeftRadius="$9"
          borderTopRightRadius="$9"
        >
          <YStack padding="$4">
            <XStack
              alignItems="center"
              justifyContent="space-between"
              marginBottom="$4"
            >
              <Text fontSize="$8" fontFamily={dinot}>
                Select screen
              </Text>
              <Button
                onPress={() => setOpen(false)}
                padding="$2"
                backgroundColor="transparent"
              >
                <ChevronDown
                  color={slate500}
                  strokeWidth={2.5}
                  style={{ transform: [{ rotate: '180deg' }] }}
                />
              </Button>
            </XStack>
            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: 100 }}
            >
              {screenList.map(item => (
                <TouchableOpacity
                  key={item}
                  onPress={() => {
                    setOpen(false);
                    navigation.navigate(item as never);
                  }}
                >
                  <XStack
                    paddingVertical="$3"
                    paddingHorizontal="$2"
                    borderBottomWidth={1}
                    borderBottomColor={slate200}
                  >
                    <Text fontSize="$5" color={slate600} fontFamily={dinot}>
                      {item}
                    </Text>
                  </XStack>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </YStack>
        </Sheet.Frame>
      </Sheet>
    </>
  );
};

const LogLevelSelector = ({
  currentLevel,
  onSelect,
}: {
  currentLevel: string;
  onSelect: (level: 'debug' | 'info' | 'warn' | 'error') => void;
}) => {
  const [open, setOpen] = useState(false);

  const logLevels = ['debug', 'info', 'warn', 'error'] as const;

  return (
    <>
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
            {currentLevel.toUpperCase()}
          </Text>
          <ChevronDown color={slate500} strokeWidth={2.5} />
        </XStack>
      </Button>

      <Sheet
        modal
        open={open}
        onOpenChange={setOpen}
        snapPoints={[50]}
        animation="medium"
        dismissOnSnapToBottom
      >
        <Sheet.Overlay />
        <Sheet.Frame
          backgroundColor={white}
          borderTopLeftRadius="$9"
          borderTopRightRadius="$9"
        >
          <YStack padding="$4">
            <XStack
              alignItems="center"
              justifyContent="space-between"
              marginBottom="$4"
            >
              <Text fontSize="$8" fontFamily={dinot}>
                Select log level
              </Text>
              <Button
                onPress={() => setOpen(false)}
                padding="$2"
                backgroundColor="transparent"
              >
                <ChevronDown
                  color={slate500}
                  strokeWidth={2.5}
                  style={{ transform: [{ rotate: '180deg' }] }}
                />
              </Button>
            </XStack>
            <ScrollView showsVerticalScrollIndicator={false}>
              {logLevels.map(level => (
                <TouchableOpacity
                  key={level}
                  onPress={() => {
                    setOpen(false);
                    onSelect(level);
                  }}
                >
                  <XStack
                    paddingVertical="$3"
                    paddingHorizontal="$2"
                    borderBottomWidth={1}
                    borderBottomColor={slate200}
                    alignItems="center"
                    justifyContent="space-between"
                  >
                    <Text fontSize="$5" color={slate600} fontFamily={dinot}>
                      {level.toUpperCase()}
                    </Text>
                    {currentLevel === level && (
                      <Check color={slate600} size={20} />
                    )}
                  </XStack>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </YStack>
        </Sheet.Frame>
      </Sheet>
    </>
  );
};

const DevSettingsScreen: React.FC<DevSettingsScreenProps> = ({}) => {
  const { clearDocumentCatalogForMigrationTesting } = usePassport();
  const clearPointEvents = usePointEventStore(state => state.clearEvents);
  const { resetBackupForPoints } = useSettingStore();
  const navigation =
    useNavigation() as NativeStackScreenProps<RootStackParamList>['navigation'];
  const subscribedTopics = useSettingStore(state => state.subscribedTopics);
  const loggingSeverity = useSettingStore(state => state.loggingSeverity);
  const setLoggingSeverity = useSettingStore(state => state.setLoggingSeverity);
  const [hasNotificationPermission, setHasNotificationPermission] =
    useState(false);
  const paddingBottom = useSafeBottomPadding(20);

  // Check notification permissions on mount
  useEffect(() => {
    const checkPermissions = async () => {
      const readiness = await isNotificationSystemReady();
      setHasNotificationPermission(readiness.ready);
    };
    checkPermissions();
  }, []);

  const handleTopicToggle = async (topics: string[], topicLabel: string) => {
    // Check permissions first
    if (!hasNotificationPermission) {
      Alert.alert(
        'Permissions Required',
        'Push notifications are not enabled. Would you like to enable them?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Enable',
            onPress: async () => {
              try {
                const granted = await requestNotificationPermission();
                if (granted) {
                  // Update permission state
                  setHasNotificationPermission(true);
                  Alert.alert(
                    'Success',
                    'Permissions granted! You can now subscribe to topics.',
                    [{ text: 'OK' }],
                  );
                } else {
                  Alert.alert(
                    'Failed',
                    'Could not enable notifications. Please enable them in your device Settings.',
                    [{ text: 'OK' }],
                  );
                }
              } catch (error) {
                Alert.alert(
                  'Error',
                  error instanceof Error
                    ? error.message
                    : 'Failed to request permissions',
                  [{ text: 'OK' }],
                );
              }
            },
          },
        ],
      );
      return;
    }

    const isCurrentlySubscribed = topics.every(topic =>
      subscribedTopics.includes(topic),
    );

    if (isCurrentlySubscribed) {
      // Show confirmation dialog for unsubscribe
      Alert.alert(
        'Disable Notifications',
        `Are you sure you want to disable push notifications for ${topicLabel}?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Disable',
            style: 'destructive',
            onPress: async () => {
              try {
                const result = await unsubscribeFromTopics(topics);
                if (result.successes.length > 0) {
                  Alert.alert(
                    'Success',
                    `Disabled notifications for ${topicLabel}`,
                    [{ text: 'OK' }],
                  );
                } else {
                  Alert.alert(
                    'Error',
                    `Failed to disable: ${result.failures.map(f => f.error).join(', ')}`,
                    [{ text: 'OK' }],
                  );
                }
              } catch (error) {
                Alert.alert(
                  'Error',
                  error instanceof Error
                    ? error.message
                    : 'Failed to unsubscribe',
                  [{ text: 'OK' }],
                );
              }
            },
          },
        ],
      );
    } else {
      // Subscribe without confirmation
      try {
        const result = await subscribeToTopics(topics);
        if (result.successes.length > 0) {
          Alert.alert('✅ Success', `Enabled notifications for ${topicLabel}`, [
            { text: 'OK' },
          ]);
        } else {
          Alert.alert(
            'Error',
            `Failed to enable: ${result.failures.map(f => f.error).join(', ')}`,
            [{ text: 'OK' }],
          );
        }
      } catch (error) {
        Alert.alert(
          'Error',
          error instanceof Error ? error.message : 'Failed to subscribe',
          [{ text: 'OK' }],
        );
      }
    }
  };

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

  const handleClearPointEventsPress = () => {
    Alert.alert(
      'Clear Point Events',
      'Are you sure you want to clear all point events from local storage?\n\nThis will reset your point history but not affect your actual points on the blockchain.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            await clearPointEvents();
            Alert.alert('Success', 'Point events cleared successfully.', [
              { text: 'OK' },
            ]);
          },
        },
      ],
    );
  };

  const handleResetBackupStatePress = () => {
    Alert.alert(
      'Reset Backup State',
      'Are you sure you want to reset the backup state?\n\nThis will allow you to see and trigger the backup points flow again.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: () => {
            resetBackupForPoints();
            Alert.alert('Success', 'Backup state reset successfully.', [
              { text: 'OK' },
            ]);
          },
        },
      ],
    );
  };

  const handleClearBackupEventsPress = () => {
    Alert.alert(
      'Clear Backup Events',
      'Are you sure you want to clear all backup point events from local storage?\n\nThis will remove backup events from your point history.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            const events = usePointEventStore.getState().events;
            const backupEvents = events.filter(
              event => event.type === 'backup',
            );
            for (const event of backupEvents) {
              await usePointEventStore.getState().removeEvent(event.id);
            }
            Alert.alert('Success', 'Backup events cleared successfully.', [
              { text: 'OK' },
            ]);
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
        paddingBottom={paddingBottom}
      >
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
            {IS_DEV_MODE && (
              <Button
                style={{ backgroundColor: 'white' }}
                borderColor={slate200}
                borderRadius="$2"
                height="$5"
                padding={0}
                onPress={() => {
                  navigation.navigate('Home', { testReferralFlow: true });
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
                    Test Referral Flow
                  </Text>
                  <ChevronRight color={slate500} strokeWidth={2.5} />
                </XStack>
              </Button>
            )}
            <ScreenSelector />
          </YStack>
        </ParameterSection>

        <ParameterSection
          icon={<BugIcon />}
          title="Push Notifications"
          description="Manage topic subscriptions"
        >
          <YStack gap="$2">
            <TopicToggleButton
              label="Starfall"
              isSubscribed={
                hasNotificationPermission && subscribedTopics.includes('nova')
              }
              onToggle={() => handleTopicToggle(['nova'], 'Starfall')}
            />
            <TopicToggleButton
              label="General"
              isSubscribed={
                hasNotificationPermission &&
                subscribedTopics.includes('general')
              }
              onToggle={() => handleTopicToggle(['general'], 'General')}
            />
            <TopicToggleButton
              label="Both (Starfall + General)"
              isSubscribed={
                hasNotificationPermission &&
                subscribedTopics.includes('nova') &&
                subscribedTopics.includes('general')
              }
              onToggle={() =>
                handleTopicToggle(['nova', 'general'], 'both topics')
              }
            />
          </YStack>
        </ParameterSection>

        <ParameterSection
          icon={<BugIcon />}
          title="Log Level"
          description="Configure logging verbosity"
        >
          <LogLevelSelector
            currentLevel={loggingSeverity}
            onSelect={setLoggingSeverity}
          />
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
            {
              label: 'Clear point events',
              onPress: handleClearPointEventsPress,
              dangerTheme: true,
            },
            {
              label: 'Reset backup state',
              onPress: handleResetBackupStatePress,
              dangerTheme: true,
            },
            {
              label: 'Clear backup events',
              onPress: handleClearBackupEventsPress,
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
