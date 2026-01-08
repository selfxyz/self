// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import { Button, ScrollView, Sheet, Text, XStack, YStack } from 'tamagui';
import { X } from '@tamagui/lucide-icons';

import {
  black,
  blue600,
  slate300,
  slate500,
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
        <YStack padding="$4" flex={1}>
          {/* Header */}
          <XStack
            alignItems="center"
            justifyContent="space-between"
            marginBottom="$4"
          >
            <Text
              fontSize={20}
              fontFamily={dinot}
              fontWeight="600"
              color={black}
            >
              Select an ID
            </Text>
            <XStack
              onPress={onDismiss}
              padding="$2"
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              testID={`${testID}-close-button`}
            >
              <X color={slate500} size={24} />
            </XStack>
          </XStack>

          {/* Document List */}
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

          {/* Footer Button */}
          <XStack marginTop="$4" paddingBottom={bottomPadding}>
            <Button
              flex={1}
              backgroundColor={canApprove ? blue600 : slate300}
              borderRadius={4}
              height={48}
              onPress={onDismiss}
              disabled={!canApprove}
              opacity={canApprove ? 1 : 0.5}
              testID={`${testID}-select-button`}
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
