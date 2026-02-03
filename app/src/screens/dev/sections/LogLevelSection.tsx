// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import React from 'react';

import BugIcon from '@/assets/icons/bug_icon.svg';
import { LogLevelSelector } from '@/screens/dev/components/LogLevelSelector';
import { ParameterSection } from '@/screens/dev/components/ParameterSection';

interface LogLevelSectionProps {
  loggingSeverity: 'debug' | 'info' | 'warn' | 'error';
  setLoggingSeverity: (severity: 'debug' | 'info' | 'warn' | 'error') => void;
}

export const LogLevelSection: React.FC<LogLevelSectionProps> = ({
  loggingSeverity,
  setLoggingSeverity,
}) => {
  return (
    <ParameterSection
      icon={<BugIcon />}
      title="Log Level"
      description="Configure logging verbosity"
    >
      <LogLevelSelector
        currentLevel={loggingSeverity}
        onSelect={setLoggingSeverity}
      />
    </ParameterSection>
  );
};
