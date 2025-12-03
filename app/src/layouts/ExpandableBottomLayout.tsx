// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import React from 'react';
import { SystemBars } from 'react-native-edge-to-edge';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type {
  BottomSectionProps,
  FullSectionProps,
  LayoutProps,
  TopSectionProps,
} from '@selfxyz/mobile-sdk-alpha';
import { ExpandableBottomLayout as BaseExpandableBottomLayout } from '@selfxyz/mobile-sdk-alpha';
import { black } from '@selfxyz/mobile-sdk-alpha/constants/colors';

const Layout: React.FC<LayoutProps> = ({
  children,
  backgroundColor,
  ...props
}) => {
  return (
    <BaseExpandableBottomLayout.Layout
      backgroundColor={backgroundColor}
      {...props}
    >
      <SystemBars style={backgroundColor === black ? 'light' : 'dark'} />
      {children}
    </BaseExpandableBottomLayout.Layout>
  );
};

const TopSection: React.FC<TopSectionProps> = ({
  children,
  backgroundColor,
  ...props
}) => {
  const { top } = useSafeAreaInsets();

  return (
    <BaseExpandableBottomLayout.TopSection
      backgroundColor={backgroundColor}
      safeAreaTop={top}
      {...props}
    >
      {children}
    </BaseExpandableBottomLayout.TopSection>
  );
};

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
    <BaseExpandableBottomLayout.FullSection
      backgroundColor={backgroundColor}
      safeAreaTop={top}
      safeAreaBottom={bottom}
      {...props}
    >
      {children}
    </BaseExpandableBottomLayout.FullSection>
  );
};

const BottomSection: React.FC<BottomSectionProps> = ({
  children,
  ...props
}) => {
  const { bottom: safeAreaBottom } = useSafeAreaInsets();

  return (
    <BaseExpandableBottomLayout.BottomSection
      safeAreaBottom={safeAreaBottom}
      {...props}
    >
      {children}
    </BaseExpandableBottomLayout.BottomSection>
  );
};

/**
 * This component is a wrapper around the ExpandableBottomLayout component from the mobile SDK
 * pacakge. It handles the safe area insets and system bars.
 */
export const ExpandableBottomLayout = {
  Layout,
  TopSection,
  FullSection,
  BottomSection,
};
