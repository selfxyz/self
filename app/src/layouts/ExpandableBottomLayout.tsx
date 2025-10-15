// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import React, { useMemo } from 'react';
import {
  Dimensions,
  PixelRatio,
  Platform,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { SystemBars } from 'react-native-edge-to-edge';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { ViewProps } from 'tamagui';
import { View } from 'tamagui';

import { black, white } from '@/utils/colors';
import { extraYPadding } from '@/utils/constants';
import useCompactLayout from '@/hooks/useCompactLayout';

// Get the current font scale factor
const fontScale = PixelRatio.getFontScale();
// fontScale > 1 means the user has increased text size in accessibility settings
const isLargerTextEnabled = fontScale > 1.3;

interface ExpandableBottomLayoutProps extends ViewProps {
  children: React.ReactNode;
  backgroundColor: string;
}

interface TopSectionProps extends ViewProps {
  children: React.ReactNode;
  backgroundColor: string;
  roundTop?: boolean;
}

interface BottomSectionProps extends ViewProps {
  children: React.ReactNode;
  backgroundColor: string;
}

const Layout: React.FC<ExpandableBottomLayoutProps> = ({
  children,
  backgroundColor,
}) => {
  return (
    <View flex={1} flexDirection="column" backgroundColor={backgroundColor}>
      <SystemBars style={backgroundColor === black ? 'light' : 'dark'} />
      {children}
    </View>
  );
};

const TopSection: React.FC<TopSectionProps> = ({
  children,
  backgroundColor,
  ...props
}) => {
  const { top } = useSafeAreaInsets();
  const { roundTop, style: incomingStyle, ...restProps } = props;
  const { selectResponsiveValue } = useCompactLayout({
    compactHeight: 760,
  });
  const spacingStyle = useMemo(
    () => ({
      paddingHorizontal: selectResponsiveValue(16, 20, 'width'),
      paddingVertical: selectResponsiveValue(16, 20, 'height'),
    }),
    [selectResponsiveValue],
  );
  return (
    <View
      {...restProps}
      backgroundColor={backgroundColor}
      style={[
        styles.topSection,
        roundTop && styles.roundTop,
        roundTop ? { marginTop: top } : { paddingTop: top },
        spacingStyle,
        { backgroundColor },
        incomingStyle,
      ]}
    >
      {children}
    </View>
  );
};

type FullSectionProps = ViewProps;
/*
 * Rather than using a top and bottom section, this component is te entire thing.
 * It leave space for the safe area insets and provides basic padding
 */
const FullSection: React.FC<FullSectionProps> = ({
  children,
  backgroundColor,
  ...props
}: FullSectionProps) => {
  const { top, bottom } = useSafeAreaInsets();
  return (
    <View
      paddingHorizontal={20}
      backgroundColor={backgroundColor}
      paddingTop={top}
      paddingBottom={bottom}
      {...props}
    >
      {children}
    </View>
  );
};

const BottomSection: React.FC<BottomSectionProps> = ({
  children,
  style,
  ...props
}) => {
  const { bottom: safeAreaBottom } = useSafeAreaInsets();
  const incomingBottom = props.paddingBottom ?? 0;
  const minBottom = safeAreaBottom + extraYPadding;
  const totalBottom =
    typeof incomingBottom === 'number' ? minBottom + incomingBottom : minBottom;
  const { selectResponsiveValue } = useCompactLayout({
    compactHeight: 760,
  });
  const spacingStyle = useMemo(
    () => ({
      paddingHorizontal: selectResponsiveValue(16, 20, 'width'),
      paddingTop: selectResponsiveValue(18, 30, 'height'),
    }),
    [selectResponsiveValue],
  );

  let panelHeight: number | 'auto' = 'auto';
  // set bottom section height to 38% of screen height
  // and wrap children in a scroll view if larger text is enabled
  if (isLargerTextEnabled) {
    const windowHeight = Dimensions.get('window').height;
    panelHeight = windowHeight * 0.38;
    children = (
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ flexGrow: 1 }}
      >
        {children}
      </ScrollView>
    );
  }

  return (
    <View
      {...props}
      height={panelHeight}
      style={[styles.bottomSection, spacingStyle, style]}
      paddingBottom={totalBottom}
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
