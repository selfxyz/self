// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import React from 'react';
import { Alert, Platform } from 'react-native';

import BugIcon from '@/assets/icons/bug_icon.svg';
import { ParameterSection } from '@/screens/dev/components/ParameterSection';
import { TopicToggleButton } from '@/screens/dev/components/TopicToggleButton';

interface DevTogglesSectionProps {
  useStrongBox: boolean;
  setUseStrongBox: (useStrongBox: boolean) => void;
}

export const DevTogglesSection: React.FC<DevTogglesSectionProps> = ({
  useStrongBox,
  setUseStrongBox,
}) => {
  if (Platform.OS !== 'android') {
    return null;
  }

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
      title="Options"
      description="Development and security options"
    >
      <TopicToggleButton
        label="Use StrongBox"
        isSubscribed={useStrongBox}
        onToggle={handleToggleStrongBox}
      />
    </ParameterSection>
  );
};
