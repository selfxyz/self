// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import React from 'react';

import BugIcon from '@/assets/icons/bug_icon.svg';
import { ParameterSection } from '@/screens/dev/components/ParameterSection';
import { TopicToggleButton } from '@/screens/dev/components/TopicToggleButton';

interface KycFlowSectionProps {
  kycEnabled: boolean;
  setKycEnabled: (enabled: boolean) => void;
}

export const KycFlowSection: React.FC<KycFlowSectionProps> = ({
  kycEnabled,
  setKycEnabled,
}) => {
  return (
    <ParameterSection
      icon={<BugIcon />}
      title="KYC Flow"
      description="Enable KYC flow for dev testing"
    >
      <TopicToggleButton
        label="KYC Flow"
        isSubscribed={kycEnabled}
        onToggle={() => setKycEnabled(!kycEnabled)}
      />
    </ParameterSection>
  );
};
