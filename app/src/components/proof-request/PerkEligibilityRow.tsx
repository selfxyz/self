// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import React from 'react';

import { PerkRail } from '@selfxyz/mobile-sdk-alpha/components';
import {
  getPerkRailLabel,
  type Perk,
} from '@selfxyz/mobile-sdk-alpha/onboarding/perks';

export type PerkEligibilityRowVariant = 'attached' | 'inline';

export interface PerkEligibilityRowProps {
  perks: Perk[];
  variant?: PerkEligibilityRowVariant;
  testID?: string;
}

export const PerkEligibilityRow: React.FC<PerkEligibilityRowProps> = ({
  perks,
  variant = 'inline',
  testID = 'perk-eligibility-row',
}) => {
  if (perks.length === 0) {
    return null;
  }

  const logos = perks.flatMap(perk => perk.renderLogos?.() ?? []);
  if (logos.length === 0) {
    return null;
  }

  return (
    <PerkRail
      variant={logos.length > 1 ? 'dense' : 'minimal'}
      logos={logos}
      label={getPerkRailLabel(perks)}
      style={
        variant === 'inline'
          ? {
              borderBottomLeftRadius: 0,
              borderBottomRightRadius: 0,
            }
          : undefined
      }
      testID={testID}
    />
  );
};
