// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import type LottieView from 'lottie-react-native';
import React, { useEffect, useMemo, useState } from 'react';
import { Adapt, Button, Select, Sheet, Text, XStack, YStack } from 'tamagui';
import { Check, ChevronDown } from '@tamagui/lucide-icons';

import type {
  provingMachineCircuitType,
  ProvingStateType,
} from '@selfxyz/mobile-sdk-alpha';
import failAnimation from '@selfxyz/mobile-sdk-alpha/animations/loading/fail.json';
import proveLoadingAnimation from '@selfxyz/mobile-sdk-alpha/animations/loading/prove.json';
import { slate200, slate500 } from '@selfxyz/mobile-sdk-alpha/constants/colors';
import { dinot } from '@selfxyz/mobile-sdk-alpha/constants/fonts';

import LoadingUI from '@/components/LoadingUI';
import { getLoadingScreenText } from '@/proving/loadingScreenStateText';

const allProvingStates = [
  'idle',
  'parsing_id_document',
  'fetching_data',
  'validating_document',
  'init_tee_connexion',
  'listening_for_status',
  'ready_to_prove',
  'proving',
  'post_proving',
  'completed',
  'error',
  'failure',
  'passport_not_supported',
  'account_recovery_choice',
  'passport_data_not_found',
] as const;

const DevLoadingScreen: React.FC = () => {
  const [currentState, setCurrentState] = useState<ProvingStateType>('idle');
  const [documentType, setDocumentType] =
    useState<provingMachineCircuitType>('dsc');
  const [animationSource, setAnimationSource] = useState<
    LottieView['props']['source']
  >(proveLoadingAnimation);
  const [loadingText, setLoadingText] = useState<{
    actionText: string;
    actionSubText: string;
    estimatedTime: string;
    statusBarProgress: number;
  }>({
    actionText: '',
    actionSubText: '',
    estimatedTime: '',
    statusBarProgress: 0,
  });
  const [canCloseApp, setCanCloseApp] = useState(false);
  const [shouldLoopAnimation, setShouldLoopAnimation] = useState(true);

  const terminalStates = useMemo<ProvingStateType[]>(
    () => [
      'completed',
      'error',
      'failure',
      'passport_not_supported',
      'account_recovery_choice',
      'passport_data_not_found',
    ],
    [],
  );

  const safeToCloseStates = useMemo<ProvingStateType[]>(
    () => ['proving', 'post_proving', 'completed'],
    [],
  );

  useEffect(() => {
    const { actionText, actionSubText, estimatedTime, statusBarProgress } =
      getLoadingScreenText(currentState, 'rsa', '65537', documentType);
    setLoadingText({
      actionText,
      actionSubText,
      estimatedTime,
      statusBarProgress,
    });

    switch (currentState) {
      case 'completed':
        break;
      case 'error':
      case 'failure':
      case 'passport_not_supported':
      case 'account_recovery_choice':
      case 'passport_data_not_found':
        setAnimationSource(failAnimation);
        break;
      default:
        setAnimationSource(proveLoadingAnimation);
        break;
    }
    setCanCloseApp(safeToCloseStates.includes(currentState));
    setShouldLoopAnimation(!terminalStates.includes(currentState));
  }, [currentState, documentType, safeToCloseStates, terminalStates]);

  const [open, setOpen] = useState(false);
  const [documentTypeOpen, setDocumentTypeOpen] = useState(false);

  return (
    <YStack flex={1} backgroundColor="black">
      <YStack gap={10} paddingHorizontal={15} paddingTop={10}>
        {/* State Selector */}
        <Select
          open={open}
          onOpenChange={setOpen}
          onValueChange={(val: string) => {
            if (val) {
              setCurrentState(val as ProvingStateType);
            }
          }}
          value={currentState || 'idle'}
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
                  State: {currentState || 'Select state'}
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
                    allProvingStates.map((item, i) => {
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

        {/* Document Type Selector */}
        <Select
          open={documentTypeOpen}
          onOpenChange={setDocumentTypeOpen}
          onValueChange={(val: string) => {
            if (val) {
              setDocumentType(val as provingMachineCircuitType);
            }
          }}
          value={documentType}
          disablePreventBodyScroll
        >
          <Select.Trigger asChild>
            <Button
              style={{ backgroundColor: 'white' }}
              borderColor={slate200}
              borderRadius="$2"
              height="$5"
              padding={0}
              onPress={() => setDocumentTypeOpen(true)}
            >
              <XStack
                width="100%"
                justifyContent="space-between"
                paddingVertical="$3"
                paddingLeft="$4"
                paddingRight="$1.5"
              >
                <Text fontSize="$5" color={slate500} fontFamily={dinot}>
                  Type: {documentType}
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
                    (['dsc', 'register', 'aadhaar'] as const).map((item, i) => {
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
      </YStack>
      <LoadingUI
        animationSource={animationSource}
        shouldLoopAnimation={shouldLoopAnimation}
        actionText={loadingText.actionText}
        actionSubText={loadingText.actionSubText}
        estimatedTime={loadingText.estimatedTime}
        canCloseApp={canCloseApp}
        statusBarProgress={loadingText.statusBarProgress}
      />
    </YStack>
  );
};

export default DevLoadingScreen;
