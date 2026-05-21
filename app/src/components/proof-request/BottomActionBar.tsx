// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet } from 'react-native';
import { Text, View, XStack, YStack } from 'tamagui';

import { slate500 as trueSlate500 } from '@selfxyz/mobile-sdk-alpha/constants/colors';
import { dinot } from '@selfxyz/mobile-sdk-alpha/constants/fonts';
import { useSafeBottomPadding } from '@selfxyz/mobile-sdk-alpha/hooks';
import type { Perk } from '@selfxyz/mobile-sdk-alpha/onboarding/perks';

import { proofRequestColors } from '@/components/proof-request/designTokens';
import { ChevronUpDownIcon } from '@/components/proof-request/icons';
import { PerkEligibilityRow } from '@/components/proof-request/PerkEligibilityRow';
import { DocumentIdentityIcon } from '@/components/shared/DocumentIdentityIcon';

export interface BottomActionBarProps {
  selectedDocumentName: string;
  selectedDocumentNationalityCode?: string;
  selectedDocumentIsMock?: boolean;
  selectedDocumentSecurityLabel?: string;
  onDocumentSelectorPress: () => void;
  onApprovePress: () => void;
  approveDisabled?: boolean;
  approving?: boolean;
  perks?: Perk[];
  /** When true, replaces the security label with an "INELIGIBLE" pill and
   *  surfaces a "Change ID" helper row under the disabled Approve. */
  ineligible?: boolean;
  /** Short reason copy shown in the helper row (e.g. "Needs an NFC-enabled
   *  passport"). Falls back to a generic message when omitted. */
  ineligibleReasonLabel?: string;
  testID?: string;
}

const INELIGIBLE_BG = '#FEF3C7';
const INELIGIBLE_BORDER = '#FDE68A';
const INELIGIBLE_FG = '#92400E';

const ICON_SIZE = 32;

/**
 * Bottom action bar with stacked pill-shaped document selector and approve
 * button. Matches Figma nodes 26164:20557 (selector) and 26164:20577 (approve).
 */
export const BottomActionBar: React.FC<BottomActionBarProps> = ({
  selectedDocumentName,
  selectedDocumentNationalityCode,
  selectedDocumentIsMock,
  selectedDocumentSecurityLabel,
  onDocumentSelectorPress,
  onApprovePress,
  approveDisabled = false,
  approving = false,
  perks,
  ineligible = false,
  ineligibleReasonLabel,
  testID = 'bottom-action-bar',
}) => {
  const hasPerks = !!perks && perks.length > 0;
  const topPadding = 4;

  const basePadding = 4;
  const safeAreaPadding = useSafeBottomPadding(basePadding);
  const dynamicPadding = safeAreaPadding;

  return (
    <View
      backgroundColor={proofRequestColors.white}
      paddingHorizontal={16}
      paddingTop={topPadding}
      paddingBottom={dynamicPadding}
      testID={testID}
    >
      <YStack gap={10}>
        <YStack>
          {/* Document selector — always a rounded-60 pill per Figma 26164:20557 */}
          <View
            borderWidth={1}
            borderColor={proofRequestColors.slate300}
            borderRadius={60}
            overflow="hidden"
            backgroundColor={proofRequestColors.white}
            zIndex={1}
            style={styles.selectorShadow}
          >
            <Pressable
              onPress={onDocumentSelectorPress}
              style={({ pressed }) => [
                styles.selectorPressable,
                pressed && styles.selectorPressed,
              ]}
              testID={`${testID}-document-selector`}
            >
              <XStack
                alignItems="center"
                gap={10}
                paddingLeft={8}
                paddingRight={14}
                paddingVertical={8}
              >
                <DocumentIdentityIcon
                  nationalityCode={selectedDocumentNationalityCode}
                  isMock={selectedDocumentIsMock}
                  size={ICON_SIZE}
                />

                {/* Name + HI-SECURITY label */}
                <YStack flex={1}>
                  <Text
                    fontFamily={dinot}
                    fontSize={14}
                    fontWeight="500"
                    color={proofRequestColors.slate900}
                    numberOfLines={1}
                    allowFontScaling={false}
                    testID={`${testID}-document-selector-name`}
                  >
                    {selectedDocumentName}
                  </Text>
                  {ineligible ? (
                    <View
                      alignSelf="flex-start"
                      backgroundColor={INELIGIBLE_BG}
                      borderColor={INELIGIBLE_BORDER}
                      borderWidth={1}
                      borderRadius={4}
                      paddingHorizontal={6}
                      paddingVertical={1}
                      marginTop={2}
                      testID={`${testID}-document-selector-ineligible`}
                    >
                      <Text
                        fontFamily={dinot}
                        fontSize={10}
                        fontWeight="500"
                        color={INELIGIBLE_FG}
                        letterSpacing={0.6}
                        textTransform="uppercase"
                        allowFontScaling={false}
                      >
                        Ineligible
                      </Text>
                    </View>
                  ) : selectedDocumentSecurityLabel ? (
                    <Text
                      fontFamily={dinot}
                      fontSize={10}
                      fontWeight="500"
                      color={trueSlate500}
                      letterSpacing={0.6}
                      textTransform="uppercase"
                      allowFontScaling={false}
                      testID={`${testID}-document-selector-security`}
                    >
                      {selectedDocumentSecurityLabel}
                    </Text>
                  ) : null}
                </YStack>

                {/* Chevron */}
                <View
                  width={29}
                  height={29}
                  alignItems="center"
                  justifyContent="center"
                >
                  <ChevronUpDownIcon
                    size={20}
                    color={proofRequestColors.slate900}
                  />
                </View>
              </XStack>
            </Pressable>
          </View>
          {hasPerks ? (
            <View
              marginTop={-12}
              paddingTop={8}
              borderLeftWidth={1}
              borderRightWidth={1}
              borderBottomWidth={1}
              borderTopWidth={0}
              borderColor={proofRequestColors.slate200}
              borderTopLeftRadius={0}
              borderTopRightRadius={0}
              borderBottomLeftRadius={16}
              borderBottomRightRadius={16}
              overflow="hidden"
              backgroundColor={proofRequestColors.white}
            >
              <PerkEligibilityRow
                perks={perks ?? []}
                variant="attached"
                testID={`${testID}-perks`}
              />
            </View>
          ) : null}
        </YStack>

        {/* Approve button (full-width pill) */}
        <Pressable
          onPress={onApprovePress}
          disabled={approveDisabled || approving}
          style={({ pressed }) => [
            styles.approveButton,
            (approveDisabled || approving) && styles.approveButtonDisabled,
            pressed &&
              !approveDisabled &&
              !approving &&
              styles.approveButtonPressed,
          ]}
          testID={`${testID}-approve`}
        >
          {approving ? (
            <ActivityIndicator color={proofRequestColors.white} size="small" />
          ) : (
            <Text
              fontFamily={dinot}
              fontSize={16}
              fontWeight="500"
              color={proofRequestColors.white}
              textAlign="center"
              allowFontScaling={false}
            >
              Approve
            </Text>
          )}
        </Pressable>

        {ineligible && !approving ? (
          <Pressable
            onPress={onDocumentSelectorPress}
            style={({ pressed }) => [
              styles.ineligibleHelper,
              pressed && styles.ineligibleHelperPressed,
            ]}
            testID={`${testID}-ineligible-helper`}
          >
            <Text
              fontFamily={dinot}
              fontSize={13}
              color={proofRequestColors.slate700}
              textAlign="center"
              allowFontScaling={false}
            >
              {ineligibleReasonLabel ?? "This ID isn't eligible for this perk."}{' '}
              <Text
                fontFamily={dinot}
                fontSize={13}
                fontWeight="600"
                color={proofRequestColors.slate900}
                textDecorationLine="underline"
                allowFontScaling={false}
                testID={`${testID}-ineligible-change-id`}
              >
                Change ID
              </Text>
            </Text>
          </Pressable>
        ) : null}
      </YStack>
    </View>
  );
};

const styles = StyleSheet.create({
  selectorShadow: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  selectorPressable: {
    backgroundColor: proofRequestColors.white,
  },
  selectorPressed: {
    backgroundColor: proofRequestColors.slate100,
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
  ineligibleHelper: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ineligibleHelperPressed: {
    opacity: 0.6,
  },
});
