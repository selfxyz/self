import React from 'react';
import { StatusBar, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { View, ViewProps } from 'tamagui';

import { black, white } from '../utils/colors';

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
      <StatusBar
        barStyle={backgroundColor === black ? 'light-content' : 'dark-content'}
        backgroundColor={backgroundColor}
      />
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
  return (
    <View
      {...props}
      backgroundColor={backgroundColor}
      style={[
        styles.topSection,
        props.roundTop && styles.roundTop,
        props.roundTop ? { marginTop: top } : { paddingTop: top },
        { backgroundColor },
      ]}
    >
      {children}
    </View>
  );
};

interface FullSectionProps extends ViewProps {}
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
  ...props
}) => {
  const { bottom } = useSafeAreaInsets();
  const incomingBottom = props.paddingBottom ?? props.pb ?? 0;

  const totalBottom =
    typeof incomingBottom === 'number' ? bottom + incomingBottom : bottom;
  return (
    <View {...props} style={styles.bottomSection} paddingBottom={totalBottom}>
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
