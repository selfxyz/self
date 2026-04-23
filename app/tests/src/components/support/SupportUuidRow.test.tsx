// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import React from 'react';
import { render } from '@testing-library/react-native';

import SupportUuidRow from '@/components/support/SupportUuidRow';
import { useSupportUuid } from '@/hooks/useSupportUuid';

jest.mock('@selfxyz/mobile-sdk-alpha/components', () => ({
  BodyText: ({ children, ...props }: any) => (
    <mock-text {...props}>{children}</mock-text>
  ),
}));

jest.mock('@/hooks/useSupportUuid', () => ({
  useSupportUuid: jest.fn(),
}));

describe('SupportUuidRow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('does not render when diagnostic IDs are disabled', () => {
    (useSupportUuid as jest.Mock).mockReturnValue({
      isEnabled: false,
      supportUuid: null,
      isReady: true,
      copy: jest.fn(),
      regenerate: jest.fn(),
      setEnabled: jest.fn(),
    });

    const { toJSON } = render(<SupportUuidRow />);

    expect(toJSON()).toBeNull();
  });

  it('renders the collapsed affordance when diagnostic IDs are enabled', () => {
    (useSupportUuid as jest.Mock).mockReturnValue({
      isEnabled: true,
      supportUuid: '11111111-1111-1111-1111-111111111111',
      isReady: true,
      copy: jest.fn(),
      regenerate: jest.fn(),
      setEnabled: jest.fn(),
    });

    const { toJSON } = render(<SupportUuidRow />);

    expect(JSON.stringify(toJSON())).toContain('Show diagnostic ID');
  });
});
