import React from 'react';
import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { View, ViewProps } from 'tamagui';

import { black, white } from '../utils/colors';

interface ExpandableBottomLayoutProps extends ViewProps {
  children: React.ReactNode;
  backgroundColor?: string;
  unsafeArea?: boolean;
}

interface TopSectionProps extends ViewProps {
  children: React.ReactNode;
  roundTop?: boolean;
}

interface BottomSectionProps extends ViewProps {
  children: React.ReactNode;
}

const Layout: React.FC<ExpandableBottomLayoutProps> = ({
  children,
  backgroundColor,
  unsafeArea,
}) => {
  if (unsafeArea) {
    return (
      <View flex={1} flexDirection="column">
        {children}
      </View>
    );
  }
  return (
    <SafeAreaView style={[styles.layout, { backgroundColor }]}>
      {children}
    </SafeAreaView>
  );
};

const TopSection: React.FC<TopSectionProps> = ({
  children,
  backgroundColor,
  ...props
}) => {
  return (
    <View
      {...props}
      style={[
        styles.topSection,
        props.roundTop && styles.roundTop,
        backgroundColor && { backgroundColor: backgroundColor as string },
      ]}
    >
      {children}
    </View>
  );
};

const BottomSection: React.FC<BottomSectionProps> = ({
  children,
  ...props
}) => {
  return (
    <View {...props} style={styles.bottomSection}>
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
  BottomSection,
};

const styles = StyleSheet.create({
  roundTop: {
    marginTop: 12,
    borderTopRightRadius: 20,
    borderTopLeftRadius: 20,
    borderTopStartRadius: 20,
    borderTopEndRadius: 20,
  },
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
