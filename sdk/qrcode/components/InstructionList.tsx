import React, { memo } from 'react';

import {
  desktopStepIconStyle,
  desktopStepIndexStyle,
  desktopStepInnerStyle,
  desktopStepStyle,
  desktopStepTextStyle,
} from '../utils/styles.js';

interface InstructionStep {
  icon: React.ComponentType<{ size?: number }>;
  text: string;
}

interface InstructionListProps {
  steps: InstructionStep[];
  darkMode?: boolean;
}

const InstructionList = memo(({ steps, darkMode = false }: InstructionListProps) => (
  <>
    {steps.map((step, index) => {
      const Icon = step.icon;

      return (
        <div key={`${step.text}-${index}`} style={desktopStepStyle(darkMode)}>
          <div style={desktopStepInnerStyle()}>
            <div style={desktopStepIndexStyle(darkMode)}>{index + 1}</div>
            <div style={desktopStepIconStyle(darkMode)}>
              <Icon size={18} />
            </div>
            <span style={desktopStepTextStyle(darkMode)}>{step.text}</span>
          </div>
        </div>
      );
    })}
  </>
));

export type { InstructionStep };
export default InstructionList;
