// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import React from 'react';
import { Alert, Platform } from 'react-native';

import BugIcon from '@/assets/icons/bug_icon.svg';
import { ParameterSection } from '@/screens/dev/components/ParameterSection';
import { TopicToggleButton } from '@/screens/dev/components/TopicToggleButton';
import { IS_DEV_MODE } from '@/utils/devUtils';

interface DevTogglesSectionProps {
  enableRecoveryCircuitTestFlow: boolean;
  setEnableRecoveryCircuitTestFlow: (
    enableRecoveryCircuitTestFlow: boolean,
  ) => void;
  useStrongBox: boolean;
  setUseStrongBox: (useStrongBox: boolean) => void;
}

export const DevTogglesSection: React.FC<DevTogglesSectionProps> = ({
  enableRecoveryCircuitTestFlow,
  setEnableRecoveryCircuitTestFlow,
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

  const handleToggleRecoveryCircuitTestFlow = () => {
    Alert.alert(
      enableRecoveryCircuitTestFlow
        ? 'Disable Recovery Circuit Test Flow'
        : 'Enable Recovery Circuit Test Flow',
      enableRecoveryCircuitTestFlow
        ? 'Successful recovery will return to the normal success screen again.'
        : 'Successful recovery will resume directly into the app proving flow for local circuit testing.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: enableRecoveryCircuitTestFlow ? 'Disable' : 'Enable',
          onPress: () =>
            setEnableRecoveryCircuitTestFlow(!enableRecoveryCircuitTestFlow),
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
      {IS_DEV_MODE && (
        <TopicToggleButton
          label="Enable recovery-to-proving circuit test flow"
          isSubscribed={enableRecoveryCircuitTestFlow}
          onToggle={handleToggleRecoveryCircuitTestFlow}
        />
      )}
      {Platform.OS === 'android' && (
        <TopicToggleButton
          label="Use StrongBox"
          isSubscribed={useStrongBox}
          onToggle={handleToggleStrongBox}
        />
      )}
    </ParameterSection>
  );
};
