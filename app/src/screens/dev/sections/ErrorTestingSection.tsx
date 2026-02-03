// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import React from 'react';

import BugIcon from '@/assets/icons/bug_icon.svg';
import { ErrorInjectionSelector } from '@/screens/dev/components/ErrorInjectionSelector';
import { ParameterSection } from '@/screens/dev/components/ParameterSection';

export const ErrorTestingSection: React.FC = () => {
  return (
    <ParameterSection
      icon={<BugIcon />}
      title="Onboarding Error Testing"
      description="Test onboarding error flows"
    >
      <ErrorInjectionSelector />
    </ParameterSection>
  );
};
