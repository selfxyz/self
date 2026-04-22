// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import React from 'react';
import { render, screen } from '@testing-library/react-native';

import { InputField } from '@/components/InputField';

jest.mock('@selfxyz/mobile-sdk-alpha', () => ({
  parseMRZBirthDate: () => new Date(1990, 0, 17),
  parseMRZExpiryDate: () => new Date(2034, 11, 19),
}));

jest.mock('react-native-date-picker', () => ({
  __esModule: true,
  default: jest.fn(() => null),
}));

describe('InputField date-of-birth type', () => {
  it('renders formatted birth date from YYMMDD value', () => {
    render(<InputField type="date-of-birth" label="DOB" value="900117" />);

    expect(screen.getByText('Jan 17 1990')).toBeTruthy();
  });

  it('updates display when value prop changes', () => {
    const { rerender } = render(
      <InputField type="date-of-birth" label="DOB" value="900117" />,
    );

    expect(screen.getByText('Jan 17 1990')).toBeTruthy();

    rerender(<InputField type="date-of-birth" label="DOB" value="950625" />);

    expect(screen.getByText('Jun 25 1995')).toBeTruthy();
  });
});

describe('InputField expiry-date type', () => {
  it('renders year > 30 as 2000s', () => {
    render(<InputField type="expiry-date" label="Expiry" value="341219" />);

    expect(screen.getByText('Dec 19 2034')).toBeTruthy();
  });
});
