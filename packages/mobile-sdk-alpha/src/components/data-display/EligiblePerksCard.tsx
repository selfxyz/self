// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

// RN port of the webview-app EligiblePerksCard. Keep props and visual rules
// in sync with the web component so a future cross-platform unification is
// mechanical.

import type React from 'react';
import { useEffect, useRef } from 'react';
import type { ViewStyle } from 'react-native';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { borderRadius, colors, fontFamily } from '@selfxyz/euclid-core';

export interface EligiblePerksCardProps {
  perks: EligiblePerksItem[];
  title?: string;
  aboutLabel?: string;
  aboutCopy?: string;
  onPerkPress?: (perkId: string) => void;
  onView?: (perkIds: string[]) => void;
  style?: ViewStyle;
}

export interface EligiblePerksItem {
  id: string;
  label: string;
  isNew?: boolean;
  renderLogo?: () => React.ReactNode;
}

const LOGO_SIZE = 42;

export const EligiblePerksCard: React.FC<EligiblePerksCardProps> = ({
  perks,
  title = 'Eligible perks',
  aboutLabel = 'About perks',
  aboutCopy = 'Self Perks is a beta feature. Use this ID to unlock unique perks with participating partners.',
  onPerkPress,
  onView,
  style,
}) => {
  const viewedRef = useRef(false);

  useEffect(() => {
    if (!viewedRef.current && perks.length > 0) {
      viewedRef.current = true;
      onView?.(perks.map(perk => perk.id));
    }
  }, [onView, perks]);

  if (perks.length === 0) {
    return null;
  }

  return (
    <View style={[styles.card, style]}>
      <Text style={styles.title}>{title}</Text>
      <View style={styles.rows}>
        {perks.map(perk => {
          const logo = perk.renderLogo?.();
          const row = (
            <>
              <View style={[styles.logoContainer, logo ? styles.logoContainerBordered : styles.logoContainerFallback]}>
                {logo}
              </View>
              <Text style={styles.label} numberOfLines={1}>
                {perk.label}
              </Text>
              {perk.isNew ? (
                <View style={styles.newPill}>
                  <Text style={styles.newPillText}>NEW</Text>
                </View>
              ) : null}
            </>
          );

          if (!onPerkPress) {
            return (
              <View key={perk.id} style={styles.row}>
                {row}
              </View>
            );
          }

          return (
            <Pressable
              key={perk.id}
              style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
              onPress={() => onPerkPress(perk.id)}
            >
              {row}
            </Pressable>
          );
        })}
      </View>
      <View style={styles.divider} />
      <View style={styles.aboutSection}>
        <Text style={styles.aboutLabel}>{aboutLabel.toUpperCase()}</Text>
        <Text style={styles.aboutCopy}>{aboutCopy}</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.slate200,
    borderRadius: borderRadius.sm,
    padding: 20,
    gap: 24,
  },
  title: {
    color: colors.black,
    fontFamily: fontFamily.advercase.native,
    fontSize: 22,
    fontWeight: '400',
  },
  rows: {
    gap: 16,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  rowPressed: {
    opacity: 0.6,
  },
  logoContainer: {
    width: LOGO_SIZE,
    height: LOGO_SIZE,
    borderRadius: LOGO_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    flexShrink: 0,
  },
  logoContainerBordered: {
    borderWidth: 1,
    borderColor: colors.slate200,
  },
  logoContainerFallback: {
    backgroundColor: colors.slate200,
  },
  label: {
    flex: 1,
    color: colors.black,
    fontFamily: fontFamily.dinOT.native,
    fontSize: 16,
    lineHeight: 20,
    fontWeight: '500',
  },
  newPill: {
    backgroundColor: colors.black,
    borderRadius: 30,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginLeft: 'auto',
  },
  newPillText: {
    color: colors.white,
    fontFamily: fontFamily.ibmPlexMono.native,
    fontSize: 10,
    lineHeight: 12.9,
    letterSpacing: 0.6,
    fontWeight: '500',
  },
  divider: {
    height: 1,
    backgroundColor: colors.slate200,
  },
  aboutSection: {
    gap: 8,
  },
  aboutLabel: {
    color: colors.slate400,
    fontFamily: fontFamily.ibmPlexMono.native,
    fontSize: 10,
    lineHeight: 13,
    letterSpacing: 1,
    fontWeight: '500',
  },
  aboutCopy: {
    color: colors.slate600,
    fontFamily: fontFamily.dinOT.native,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '500',
  },
});
