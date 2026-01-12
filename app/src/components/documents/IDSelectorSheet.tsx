// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import { Button, ScrollView, Sheet, Text, View, XStack, YStack } from 'tamagui';

import {
  black,
  blue600,
  slate200,
  white,
} from '@selfxyz/mobile-sdk-alpha/constants/colors';
import { dinot } from '@selfxyz/mobile-sdk-alpha/constants/fonts';
import { useSafeBottomPadding } from '@selfxyz/mobile-sdk-alpha/hooks';

import type { IDSelectorState } from '@/components/documents/IDSelectorItem';
import {
  IDSelectorItem,
  isDisabledState,
} from '@/components/documents/IDSelectorItem';

export interface IDSelectorDocument {
  id: string;
  name: string;
  state: IDSelectorState;
}

export interface IDSelectorSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  documents: IDSelectorDocument[];
  selectedId?: string;
  onSelect: (documentId: string) => void;
  onDismiss: () => void;
  onApprove: () => void;
  testID?: string;
}

export const IDSelectorSheet: React.FC<IDSelectorSheetProps> = ({
  open,
  onOpenChange,
  documents,
  selectedId,
  onSelect,
  onDismiss,
  onApprove,
  testID = 'id-selector-sheet',
}) => {
  const bottomPadding = useSafeBottomPadding(16);

  // Check if the selected document is valid (not expired or unregistered)
  const selectedDoc = documents.find(d => d.id === selectedId);
  const canApprove = selectedDoc && !isDisabledState(selectedDoc.state);

  return (
    <Sheet
      modal
      open={open}
      onOpenChange={onOpenChange}
      snapPoints={[55]}
      animation="medium"
      dismissOnSnapToBottom
    >
      <Sheet.Overlay
        backgroundColor="rgba(0, 0, 0, 0.5)"
        animation="lazy"
        enterStyle={{ opacity: 0 }}
        exitStyle={{ opacity: 0 }}
      />
      <Sheet.Frame
        backgroundColor={white}
        borderTopLeftRadius="$9"
        borderTopRightRadius="$9"
        testID={testID}
      >
        <YStack padding={20} paddingTop={30} flex={1}>
          {/* Header */}
          <Text
            fontSize={20}
            fontFamily={dinot}
            fontWeight="500"
            color={black}
            marginBottom={32}
          >
            Select an ID
          </Text>

          {/* Document List Container with border radius */}
          <View
            flex={1}
            backgroundColor={white}
            borderRadius={10}
            overflow="hidden"
            marginBottom={32}
          >
            <ScrollView
              flex={1}
              showsVerticalScrollIndicator={false}
              testID={`${testID}-list`}
            >
              {documents.map((doc, index) => {
                const isSelected = doc.id === selectedId;
                // Don't override to 'active' if the document is in a disabled state
                const itemState: IDSelectorState =
                  isSelected && !isDisabledState(doc.state)
                    ? 'active'
                    : doc.state;

                return (
                  <IDSelectorItem
                    key={doc.id}
                    documentName={doc.name}
                    state={itemState}
                    onPress={() => onSelect(doc.id)}
                    isLastItem={index === documents.length - 1}
                    testID={`${testID}-item-${doc.id}`}
                  />
                );
              })}
            </ScrollView>
          </View>

          {/* Footer Buttons */}
          <XStack gap={10} paddingBottom={bottomPadding}>
            <Button
              flex={1}
              backgroundColor={white}
              borderWidth={1}
              borderColor={slate200}
              borderRadius={4}
              height={48}
              alignItems="center"
              justifyContent="center"
              onPress={onDismiss}
              testID={`${testID}-dismiss-button`}
              pressStyle={{ opacity: 0.7 }}
            >
              <Text
                fontFamily={dinot}
                fontSize={18}
                fontWeight="500"
                color={black}
              >
                Dismiss
              </Text>
            </Button>
            <Button
              flex={1}
              backgroundColor={blue600}
              borderRadius={4}
              height={48}
              alignItems="center"
              justifyContent="center"
              onPress={onApprove}
              disabled={!canApprove}
              opacity={canApprove ? 1 : 0.5}
              testID={`${testID}-select-button`}
              pressStyle={{ opacity: 0.7 }}
            >
              <Text
                fontFamily={dinot}
                fontSize={18}
                fontWeight="500"
                color={white}
              >
                Select
              </Text>
            </Button>
          </XStack>
        </YStack>
      </Sheet.Frame>
    </Sheet>
  );
};
