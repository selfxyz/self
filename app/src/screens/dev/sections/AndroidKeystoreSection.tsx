// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import React from 'react';
import { Alert } from 'react-native';

import BugIcon from '@/assets/icons/bug_icon.svg';
import { ParameterSection } from '@/screens/dev/components/ParameterSection';
import { TopicToggleButton } from '@/screens/dev/components/TopicToggleButton';

interface AndroidKeystoreSectionProps {
  useStrongBox: boolean;
  setUseStrongBox: (useStrongBox: boolean) => void;
}

export const AndroidKeystoreSection: React.FC<AndroidKeystoreSectionProps> = ({
  useStrongBox,
  setUseStrongBox,
}) => {
  const handleToggleStrongBox = () => {
    Alert.alert(
      useStrongBox ? 'Disable StrongBox' : 'Enable StrongBox',
      useStrongBox
        ? 'New keys will be generated without StrongBox hardware backing. Existing keys will continue to work.'
        : 'New keys will attempt to use StrongBox hardware backing for enhanced security.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: useStrongBox ? 'Disable' : 'Enable',
          onPress: () => setUseStrongBox(!useStrongBox),
        },
      ],
    );
  };

  return (
    <ParameterSection
      icon={<BugIcon />}
      title="Android Keystore"
      description="Configure keystore security options"
    >
      <TopicToggleButton
        label="Use StrongBox"
        isSubscribed={useStrongBox}
        onToggle={handleToggleStrongBox}
      />
    </ParameterSection>
  );
};
