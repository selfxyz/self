// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

// RN port of @selfxyz/euclid PerkRail. Keep props and visual rules in sync
// with the web component so a future cross-platform unification is mechanical.

import type React from 'react';
import type { ViewStyle } from 'react-native';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, fontFamily } from '@selfxyz/euclid-core';

export interface PerkRailProps {
  variant?: PerkRailVariant;
  logos: React.ReactNode[];
  label?: string;
  onPress?: () => void;
  style?: ViewStyle;
  testID?: string;
}

export type PerkRailVariant = 'dense' | 'minimal';

const LOGO_SIZE = 32;
const DENSE_MAX_LOGOS = 3;
const MINIMAL_MAX_LOGOS = 1;

function defaultLabel(count: number): string {
  return count === 1 ? 'ELIGIBLE FOR 1 PERK' : `ELIGIBLE FOR ${count} PERKS`;
}

export const PerkRail: React.FC<PerkRailProps> = ({ variant = 'dense', logos, label, onPress, style, testID }) => {
  const max = variant === 'dense' ? DENSE_MAX_LOGOS : MINIMAL_MAX_LOGOS;
  const visibleLogos = logos.slice(0, max);
  const labelText = label ?? defaultLabel(logos.length);

  const containerStyle = [
    styles.container,
    variant === 'dense' ? styles.containerDense : styles.containerMinimal,
    style,
  ];

  const content = (
    <View style={styles.innerRow}>
      {variant === 'dense' ? (
        <View style={styles.denseLogosRow}>
          {visibleLogos.map((logo, index) => {
            const isLast = index === visibleLogos.length - 1;
            return (
              <View
                key={index}
                style={[
                  styles.denseLogoWrapper,
                  {
                    marginRight: isLast ? 0 : -8,
                    zIndex: visibleLogos.length - index,
                  },
                ]}
              >
                {logo}
              </View>
            );
          })}
        </View>
      ) : (
        visibleLogos[0] !== undefined && <View style={styles.minimalLogoWrapper}>{visibleLogos[0]}</View>
      )}
      <View style={styles.labelPill}>
        <Text style={styles.labelText}>{labelText}</Text>
      </View>
    </View>
  );

  if (onPress) {
    return (
      <Pressable onPress={onPress} style={containerStyle} testID={testID}>
        {content}
      </Pressable>
    );
  }
  return (
    <View style={containerStyle} testID={testID}>
      {content}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
    backgroundColor: 'transparent',
  },
  containerDense: {
    padding: 12,
  },
  containerMinimal: {
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  innerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flex: 1,
    minWidth: 0,
    gap: 8,
  },
  denseLogosRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    minWidth: 0,
  },
  denseLogoWrapper: {
    width: LOGO_SIZE,
    height: LOGO_SIZE,
    borderRadius: LOGO_SIZE / 2,
    backgroundColor: colors.white,
    borderWidth: 2,
    borderColor: colors.slate100,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    // Drop shadow per web `boxShadow: 0 0 4px rgba(0,0,0,0.25)`.
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 4,
    elevation: 2,
  },
  minimalLogoWrapper: {
    width: LOGO_SIZE,
    height: LOGO_SIZE,
    borderRadius: LOGO_SIZE / 2,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.slate200,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  labelPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.slate200,
    borderRadius: 30,
    paddingHorizontal: 8,
    paddingVertical: 4,
    flexShrink: 0,
  },
  labelText: {
    fontFamily: fontFamily.dinOT.native,
    fontWeight: '500',
    fontSize: 10,
    lineHeight: 12.9,
    letterSpacing: 0.6,
    color: colors.slate800,
    textTransform: 'uppercase',
  },
});
