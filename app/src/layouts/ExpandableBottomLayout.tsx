import React from 'react';
import { StyleSheet, View } from 'react-native';

import { black, white } from '../utils/colors';

interface ExpandableBottomLayoutProps {
  children: React.ReactNode;
}

interface TopSectionProps {
  children: React.ReactNode;
}

interface BottomSectionProps {
  children: React.ReactNode;
}

const Layout: React.FC<ExpandableBottomLayoutProps> = ({ children }) => {
  return <View style={styles.layout}>{children}</View>;
};

const TopSection: React.FC<TopSectionProps> = ({ children }) => {
  return <View style={styles.topSection}>{children}</View>;
};

const BottomSection: React.FC<BottomSectionProps> = ({ children }) => {
  return <View style={styles.bottomSection}>{children}</View>;
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
  BottomSection,
};

const styles = StyleSheet.create({
  layout: {
    height: '100%',
    flexDirection: 'column',
  },
  topSection: {
    alignSelf: 'stretch',
    flexGrow: 1,
    flexShrink: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: black,
    overflow: 'hidden',
    padding: 20, // TODO necessary?
  },
  bottomSection: {
    backgroundColor: white,
    paddingTop: 30,
    paddingLeft: 20,
    paddingRight: 20,
  },
});
