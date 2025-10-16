// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import type React from 'react';
import { Dimensions, PixelRatio, Platform, ScrollView, StyleSheet } from 'react-native';

import type { ViewProps } from '../components';
import { View } from '../components';
import { black, white } from '../constants/colors';
import { extraYPadding } from '../constants/layout';

const SAFE_AREA_TOP_DEFAULT = 0;
const SAFE_AREA_BOTTOM_DEFAULT = 0;

// Get the current font scale factor
const fontScale = PixelRatio.getFontScale();
// fontScale > 1 means the user has increased text size in accessibility settings
const isLargerTextEnabled = fontScale > 1.3;

export interface BottomSectionProps extends ViewProps {
  children: React.ReactNode;
  backgroundColor: string;
  safeAreaBottom?: number;
}

export type FullSectionProps = ViewProps & {
  safeAreaTop?: number;
  safeAreaBottom?: number;
};

export interface LayoutProps extends ViewProps {
  children: React.ReactNode;
  backgroundColor: string;
  safeAreaTop?: number;
  safeAreaBottom?: number;
}

const Layout: React.FC<LayoutProps> = ({ children, backgroundColor }) => {
  return (
    <View flex={1} flexDirection="column" backgroundColor={backgroundColor}>
      {children}
    </View>
  );
};

const TopSection: React.FC<TopSectionProps> = ({ children, backgroundColor, ...props }) => {
  const { safeAreaTop = SAFE_AREA_TOP_DEFAULT } = props;
  const { roundTop, ...restProps } = props;

  return (
    <View
      {...restProps}
      backgroundColor={backgroundColor}
      style={[
        styles.topSection,
        roundTop && styles.roundTop,
        roundTop ? { marginTop: safeAreaTop } : { paddingTop: safeAreaTop },
        { backgroundColor },
      ]}
    >
      {children}
    </View>
  );
};

/**
 * This component is a layout that has a top and bottom section. Bottom section
 * automatically expands to as much space as it needs while the top section
 * takes up the remaining space.
 *
 * Usage:
 *
 * import { ExpandableBottomLayout } from '../components/ExpandableBottomLayout';
 *
 * <ExpandableBottomLayout.Layout>
 *   <ExpandableBottomLayout.TopSection>
 *     <...top section content...>
 *   </ExpandableBottomLayout.TopSection>
 *   <ExpandableBottomLayout.BottomSection>
 *     <...bottom section content...>
 *   </ExpandableBottomLayout.BottomSection>
 * </ExpandableBottomLayout.Layout>
 */
export type SafeAreaInsets = {
  top: number;
  bottom: number;
};
/*
 * Rather than using a top and bottom section, this component is te entire thing.
 * It leave space for the safe area insets and provides basic padding
 */
const FullSection: React.FC<FullSectionProps> = ({ children, backgroundColor, ...props }: FullSectionProps) => {
  const { safeAreaTop = SAFE_AREA_TOP_DEFAULT, safeAreaBottom = SAFE_AREA_BOTTOM_DEFAULT } = props;
  return (
    <View
      paddingHorizontal={20}
      backgroundColor={backgroundColor}
      paddingTop={safeAreaTop}
      paddingBottom={safeAreaBottom}
      {...props}
    >
      {children}
    </View>
  );
};

const BottomSection: React.FC<BottomSectionProps> = ({ children, style, ...props }) => {
  const incomingBottom = props.paddingBottom ?? 0;
  const { safeAreaBottom = SAFE_AREA_BOTTOM_DEFAULT } = props;
  const minBottom = safeAreaBottom + extraYPadding;
  const totalBottom = typeof incomingBottom === 'number' ? minBottom + incomingBottom : minBottom;

  let panelHeight: number | 'auto' = 'auto';
  // set bottom section height to 38% of screen height
  // and wrap children in a scroll view if larger text is enabled
  if (isLargerTextEnabled) {
    const windowHeight = Dimensions.get('window').height;
    panelHeight = windowHeight * 0.38;
    children = (
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ flexGrow: 1 }}>
        {children}
      </ScrollView>
    );
  }

  return (
    <View {...props} height={panelHeight} style={[styles.bottomSection, style]} paddingBottom={totalBottom}>
      {children}
    </View>
  );
};

export interface TopSectionProps extends ViewProps {
  children: React.ReactNode;
  backgroundColor: string;
  roundTop?: boolean;
  safeAreaTop?: number;
}

export const ExpandableBottomLayout = {
  Layout,
  TopSection,
  FullSection,
  BottomSection,
};

const styles = StyleSheet.create({
  roundTop: {
    marginTop: 12,
    overflow: 'hidden',
    borderTopRightRadius: 30,
    borderTopLeftRadius: 30,
  },
  layout: {
    height: '100%',
    flexDirection: 'column',
  },
  topSection: {
    alignSelf: 'stretch',
    flexGrow: 1,
    flexShrink: Platform.select({ web: 0, default: 1 }),
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: black,
    overflow: 'hidden',
    padding: 20,
  },
  bottomSection: {
    backgroundColor: white,
    paddingTop: 30,
    paddingLeft: 20,
    paddingRight: 20,
  },
});
