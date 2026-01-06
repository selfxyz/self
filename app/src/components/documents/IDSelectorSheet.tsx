// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import {
  Button,
  ScrollView,
  Separator,
  Sheet,
  Text,
  XStack,
  YStack,
} from 'tamagui';
import { X } from '@tamagui/lucide-icons';

import {
  black,
  blue600,
  slate300,
  slate500,
  white,
} from '@selfxyz/mobile-sdk-alpha/constants/colors';
import { dinot } from '@selfxyz/mobile-sdk-alpha/constants/fonts';

import type { IDSelectorState } from '@/components/documents/IDSelectorItem';
import { IDSelectorItem } from '@/components/documents/IDSelectorItem';

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

          <Separator borderColor={slate300} marginBottom="$2" />

          {/* Document List */}
          <ScrollView
            flex={1}
            showsVerticalScrollIndicator={false}
            testID={`${testID}-list`}
          >
            {documents.map(doc => {
              const isSelected = doc.id === selectedId;
              const itemState: IDSelectorState = isSelected
                ? 'active'
                : doc.state;

              return (
                <IDSelectorItem
                  key={doc.id}
                  documentName={doc.name}
                  state={itemState}
                  onPress={() => onSelect(doc.id)}
                  testID={`${testID}-item-${doc.id}`}
                />
              );
            })}
          </ScrollView>

          {/* Footer Buttons */}
          <XStack gap={12} marginTop="$4" paddingBottom="$2">
            <Button
              flex={1}
              backgroundColor={white}
              borderWidth={1}
              borderColor={slate300}
              borderRadius={8}
              paddingVertical={16}
              onPress={onDismiss}
              testID={`${testID}-dismiss-button`}
            >
              <Text
                fontFamily={dinot}
                fontSize={16}
                fontWeight="500"
                color={black}
              >
                Dismiss
              </Text>
            </Button>
            <Button
              flex={1}
              backgroundColor={blue600}
              borderRadius={8}
              paddingVertical={16}
              onPress={onApprove}
              testID={`${testID}-approve-button`}
            >
              <Text
                fontFamily={dinot}
                fontSize={16}
                fontWeight="500"
                color={white}
              >
                Approve
              </Text>
            </Button>
          </XStack>
        </YStack>
      </Sheet.Frame>
    </Sheet>
  );
};
