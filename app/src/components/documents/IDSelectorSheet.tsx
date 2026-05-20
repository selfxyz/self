// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import { useEffect, useRef } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { ScrollView, Sheet, Text, View, YStack } from 'tamagui';

import { useSelfClient } from '@selfxyz/mobile-sdk-alpha';
import { ProofRequestPickerEvents } from '@selfxyz/mobile-sdk-alpha/constants/analytics';
import {
  black,
  blue600,
  slate100,
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
  /** ISO 3166-1 alpha-3 nationality code used for the row's flag icon. */
  nationalityCode?: string;
  /** Mock/dev documents render the dev logo instead of a flag. */
  isMock?: boolean;
  /** "HI-SECURITY" / "LOW-SECURITY" / "STANDARD" right-aligned pill. */
  securityLabel?: string;
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
      snapPoints={[60]}
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
        borderTopLeftRadius={20}
        borderTopRightRadius={20}
        testID={testID}
      >
        <YStack paddingHorizontal={20} paddingTop={30} flex={1}>
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

          {/* Document List */}
          <View flex={1} marginBottom={32}>
            <ScrollView
              flex={1}
              showsVerticalScrollIndicator={false}
              testID={`${testID}-list`}
            >
              <YStack gap={8}>
                {documents.map(doc => {
                  const ineligible = isIneligible(doc.id);
                  const isSelected = doc.id === selectedId;
                  // Don't override to 'active' if the document is disabled or
                  // ineligible — keep the underlying state so the subtitle and
                  // colors stay correct (e.g. mock docs read "Testing document").
                  const itemState: IDSelectorState =
                    isSelected && !isDisabledState(doc.state) && !ineligible
                      ? 'active'
                      : doc.state;

                  const isActive = itemState === 'active';
                  const activePerks = isActive
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

                  const item = (
                    <IDSelectorItem
                      documentName={doc.name}
                      state={itemState}
                      ineligible={ineligible}
                      onPress={() => handleSelect(doc.id)}
                      onIneligiblePress={() => handleIneligiblePress(doc.id)}
                      nationalityCode={doc.nationalityCode}
                      isMock={doc.isMock}
                      securityLabel={doc.securityLabel}
                      showSeparator={!isActive}
                      testID={`${testID}-item-${doc.id}`}
                    />
                  );

                  const hasPerks = isActive && !!perkSlot;
                  return (
                    <View
                      key={doc.id}
                      backgroundColor={isActive ? slate100 : 'transparent'}
                      borderRadius={10}
                      borderWidth={1}
                      borderColor={isActive ? slate200 : 'transparent'}
                      overflow="hidden"
                      testID={
                        isActive
                          ? `${testID}-active-wrapper-${doc.id}`
                          : undefined
                      }
                    >
                      <View
                        backgroundColor={white}
                        borderRadius={10}
                        borderWidth={2}
                        borderColor={isActive ? blue600 : 'transparent'}
                        overflow="hidden"
                        style={isActive ? styles.activeCardShadow : undefined}
                      >
                        {item}
                      </View>
                      {hasPerks ? perkSlot : null}
                    </View>
                  );
                })}
              </YStack>
            </ScrollView>
          </View>

          {/* Footer Buttons — stacked pill buttons */}
          <YStack gap={10} paddingBottom={bottomPadding}>
            <Pressable
              onPress={onApprove}
              disabled={!canApprove}
              style={({ pressed }) => [
                styles.approveButton,
                !canApprove && styles.approveButtonDisabled,
                pressed && canApprove && styles.approveButtonPressed,
              ]}
              testID={`${testID}-select-button`}
            >
              <Text
                fontFamily={dinot}
                fontSize={16}
                fontWeight="500"
                color={white}
                allowFontScaling={false}
              >
                Approve
              </Text>
            </Pressable>
            <Pressable
              onPress={onDismiss}
              style={({ pressed }) => [
                styles.dismissButton,
                pressed && styles.dismissButtonPressed,
              ]}
              testID={`${testID}-dismiss-button`}
            >
              <Text
                fontFamily={dinot}
                fontSize={16}
                fontWeight="500"
                color={black}
                allowFontScaling={false}
              >
                Dismiss
              </Text>
            </Pressable>
          </YStack>
        </YStack>
      </Sheet.Frame>
    </Sheet>
  );
};

const styles = StyleSheet.create({
  activeCardShadow: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 4,
  },
  approveButton: {
    backgroundColor: '#000000',
    borderColor: '#334155',
    borderWidth: 1,
    borderRadius: 60,
    paddingHorizontal: 14,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  approveButtonDisabled: {
    opacity: 0.5,
  },
  approveButtonPressed: {
    opacity: 0.85,
  },
  dismissButton: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E2E8F0',
    borderWidth: 1,
    borderRadius: 60,
    paddingHorizontal: 14,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dismissButtonPressed: {
    opacity: 0.7,
  },
});
