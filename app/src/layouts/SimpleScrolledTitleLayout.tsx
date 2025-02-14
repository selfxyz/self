import React from 'react';

import { ScrollView, YStack } from 'tamagui';

import { PrimaryButton } from '../components/buttons/PrimaryButton';
import { Title } from '../components/typography/Title';
import { white } from '../utils/colors';
import { ExpandableBottomLayout } from './ExpandableBottomLayout';

interface DetailListProps
  extends React.PropsWithChildren<{ title: string; onDismiss: () => void }> {}

export default function SimpleScrolledTitleLayout({
  title,
  children,
  onDismiss,
}: DetailListProps) {
  return (
    <ExpandableBottomLayout.Layout backgroundColor={white}>
      <ExpandableBottomLayout.FullSection paddingTop={0} flex={1}>
        <ScrollView flex={1}>
          <YStack paddingTop={20}>
            <Title>{title}</Title>
            <YStack paddingVertical={20} flex={1}>
              {children}
            </YStack>
          </YStack>
        </ScrollView>
        <PrimaryButton onPress={onDismiss}>Dismiss</PrimaryButton>
      </ExpandableBottomLayout.FullSection>
    </ExpandableBottomLayout.Layout>
  );
}
