// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import { useEffect, useRef } from 'react';
import { Button, ScrollView, Sheet, Text, View, XStack, YStack } from 'tamagui';

import { useSelfClient } from '@selfxyz/mobile-sdk-alpha';
import { ProofRequestPickerEvents } from '@selfxyz/mobile-sdk-alpha/constants/analytics';
import {
  black,
  blue600,
  slate200,
  white,
} from '@selfxyz/mobile-sdk-alpha/constants/colors';
import { dinot } from '@selfxyz/mobile-sdk-alpha/constants/fonts';
import { useSafeBottomPadding } from '@selfxyz/mobile-sdk-alpha/hooks';
import type { Perk, PerkId } from '@selfxyz/mobile-sdk-alpha/onboarding/perks';

import type { IDSelectorState } from '@/components/documents/IDSelectorItem';
import {
  IDSelectorItem,
  isDisabledState,
} from '@/components/documents/IDSelectorItem';
import { PerkEligibilityRow } from '@/components/proof-request/PerkEligibilityRow';
import type { IneligibleReason } from '@/utils/googleUsatGate';

export interface IDSelectorDocument {
  id: string;
  name: string;
  state: IDSelectorState;
  /** Document type slug for analytics (e.g. 'passport', 'aadhaar'). */
  idType?: string;
}

export interface IDSelectorSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  documents: IDSelectorDocument[];
  selectedId?: string;
  onSelect: (documentId: string) => void;
  onDismiss: () => void;
  onApprove: () => void;
  activePerkId?: PerkId;
  perksByDocumentId?: Record<string, Perk[]>;
  ineligibleReasonByDocumentId?: Record<string, IneligibleReason>;
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
  activePerkId,
  perksByDocumentId,
  ineligibleReasonByDocumentId,
  testID = 'id-selector-sheet',
}) => {
  const bottomPadding = useSafeBottomPadding(16);
  const selfClient = useSelfClient();
  const viewedFiredRef = useRef(false);

  const isIneligible = (id: string) => !!ineligibleReasonByDocumentId?.[id];

  // Selection is valid when the underlying state is not disabled and the
  // document is not flagged ineligible by the active perk gate.
  const selectedDoc = documents.find(d => d.id === selectedId);
  const canApprove =
    selectedDoc &&
    !isDisabledState(selectedDoc.state) &&
    !isIneligible(selectedDoc.id);

  useEffect(() => {
    if (!open) {
      viewedFiredRef.current = false;
      return;
    }
    if (viewedFiredRef.current) {
      return;
    }
    if (!activePerkId) {
      return;
    }
    viewedFiredRef.current = true;

    let eligibleCount = 0;
    let ineligibleCount = 0;
    for (const doc of documents) {
      if (ineligibleReasonByDocumentId?.[doc.id]) {
        ineligibleCount += 1;
      } else {
        eligibleCount += 1;
      }
    }
    selfClient.trackEvent(ProofRequestPickerEvents.VIEWED, {
      perk_id: activePerkId,
      eligible_count: eligibleCount,
      ineligible_count: ineligibleCount,
    });
  }, [open, activePerkId, documents, ineligibleReasonByDocumentId, selfClient]);

  const handleSelect = (documentId: string) => {
    if (activePerkId) {
      const wasEligible = !ineligibleReasonByDocumentId?.[documentId];
      const idType =
        documents.find(d => d.id === documentId)?.idType ?? 'unknown';
      selfClient.trackEvent(ProofRequestPickerEvents.ID_SELECTED, {
        id_type: idType,
        perk_id: activePerkId,
        was_eligible: wasEligible,
      });
    }
    onSelect(documentId);
  };

  const handleIneligiblePress = (documentId: string) => {
    if (!activePerkId) {
      return;
    }
    const reason = ineligibleReasonByDocumentId?.[documentId];
    if (!reason) {
      return;
    }
    const idType =
      documents.find(d => d.id === documentId)?.idType ?? 'unknown';
    selfClient.trackEvent(ProofRequestPickerEvents.INELIGIBLE_ID_TAPPED, {
      id_type: idType,
      perk_id: activePerkId,
      reason,
    });
  };

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
            allowFontScaling={false}
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
                const ineligible = isIneligible(doc.id);
                const isSelected = doc.id === selectedId;
                // Don't override to 'active' if the document is disabled or
                // ineligible — keep the underlying state so the subtitle and
                // colors stay correct (e.g. mock docs read "Testing document").
                const itemState: IDSelectorState =
                  isSelected && !isDisabledState(doc.state) && !ineligible
                    ? 'active'
                    : doc.state;

                const activePerks =
                  itemState === 'active'
                    ? perksByDocumentId?.[doc.id]
                    : undefined;
                const perkSlot =
                  activePerks && activePerks.length > 0 ? (
                    <PerkEligibilityRow
                      perks={activePerks}
                      variant="inline"
                      testID={`${testID}-item-${doc.id}-perks`}
                    />
                  ) : undefined;

                return (
                  <IDSelectorItem
                    key={doc.id}
                    documentName={doc.name}
                    state={itemState}
                    ineligible={ineligible}
                    onPress={() => handleSelect(doc.id)}
                    onIneligiblePress={() => handleIneligiblePress(doc.id)}
                    isLastItem={index === documents.length - 1}
                    perkSlot={perkSlot}
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
                allowFontScaling={false}
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
                allowFontScaling={false}
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
