// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import React, { useCallback, useRef, useState } from 'react';
import { ScrollView, TouchableOpacity } from 'react-native';
import { Button, Sheet, Text, XStack, YStack } from 'tamagui';
import { Check, ChevronDown } from '@tamagui/lucide-icons';

import {
  red500,
  slate200,
  slate500,
  slate600,
  slate800,
  white,
} from '@selfxyz/mobile-sdk-alpha/constants/colors';
import { dinot } from '@selfxyz/mobile-sdk-alpha/constants/fonts';

import type { InjectedErrorType } from '@/stores/errorInjectionStore';
import {
  ERROR_GROUPS,
  ERROR_LABELS,
  useErrorInjectionStore,
} from '@/stores/errorInjectionStore';
import {
  registerModalCallbacks,
  unregisterModalCallbacks,
} from '@/utils/modalCallbackRegistry';

export const ErrorInjectionSelector = () => {
  const injectedErrors = useErrorInjectionStore(state => state.injectedErrors);
  const setInjectedErrors = useErrorInjectionStore(
    state => state.setInjectedErrors,
  );
  const clearAllErrors = useErrorInjectionStore(state => state.clearAllErrors);
  const [open, setOpen] = useState(false);
  const callbackIdRef = useRef<number | undefined>(undefined);

  const handleModalDismiss = useCallback(() => {
    setOpen(false);
    if (callbackIdRef.current !== undefined) {
      unregisterModalCallbacks(callbackIdRef.current);
      callbackIdRef.current = undefined;
    }
  }, []);

  const openSheet = useCallback(() => {
    setOpen(true);
    const id = registerModalCallbacks({
      onButtonPress: () => {},
      onModalDismiss: handleModalDismiss,
    });
    callbackIdRef.current = id;
  }, [handleModalDismiss]);

  const closeSheet = useCallback(() => {
    handleModalDismiss();
  }, [handleModalDismiss]);

  const handleSheetOpenChange = useCallback(
    (isOpen: boolean) => {
      if (!isOpen) {
        handleModalDismiss();
      } else {
        setOpen(isOpen);
      }
    },
    [handleModalDismiss],
  );

  // Single error selection - replace instead of toggle
  const selectError = (errorType: InjectedErrorType) => {
    // If clicking the same error, clear it; otherwise set the new one
    if (injectedErrors.length === 1 && injectedErrors[0] === errorType) {
      clearAllErrors();
    } else {
      setInjectedErrors([errorType]);
    }
    // Close the sheet after selection
    closeSheet();
  };

  const currentError = injectedErrors.length > 0 ? injectedErrors[0] : null;
  const currentErrorLabel = currentError ? ERROR_LABELS[currentError] : null;

  return (
    <YStack gap="$2">
      <Button
        style={{ backgroundColor: 'white' }}
        borderColor={slate200}
        borderRadius="$2"
        height="$5"
        padding={0}
        onPress={openSheet}
      >
        <XStack
          width="100%"
          justifyContent="space-between"
          paddingVertical="$3"
          paddingLeft="$4"
          paddingRight="$1.5"
        >
          <Text fontSize="$5" color={slate500} fontFamily={dinot}>
            {currentErrorLabel || 'Select onboarding error to test'}
          </Text>
          <ChevronDown color={slate500} strokeWidth={2.5} />
        </XStack>
      </Button>

      {currentError && (
        <Button
          backgroundColor={red500}
          borderRadius="$2"
          height="$5"
          onPress={clearAllErrors}
          pressStyle={{
            opacity: 0.8,
            scale: 0.98,
          }}
        >
          <Text color={white} fontSize="$5" fontFamily={dinot}>
            Clear
          </Text>
        </Button>
      )}

      <Sheet
        modal
        open={open}
        onOpenChange={handleSheetOpenChange}
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
                Onboarding Error Testing
              </Text>
              <Button
                onPress={closeSheet}
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
              {Object.entries(ERROR_GROUPS).map(([groupName, errors]) => (
                <YStack key={groupName} marginBottom="$4">
                  <Text
                    fontSize="$6"
                    fontFamily={dinot}
                    fontWeight="600"
                    color={slate800}
                    marginBottom="$2"
                  >
                    {groupName}
                  </Text>
                  {errors.map((errorType: InjectedErrorType) => (
                    <TouchableOpacity
                      key={errorType}
                      onPress={() => selectError(errorType)}
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
                          {ERROR_LABELS[errorType]}
                        </Text>
                        {currentError === errorType && (
                          <Check color={slate600} size={20} />
                        )}
                      </XStack>
                    </TouchableOpacity>
                  ))}
                </YStack>
              ))}
            </ScrollView>
          </YStack>
        </Sheet.Frame>
      </Sheet>
    </YStack>
  );
};
