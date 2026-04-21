// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import React from 'react';
import { render, screen } from '@testing-library/react-native';

import { InputField } from './InputField';

jest.mock('react-native-date-picker', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { View } = require('react-native');
  return {
    __esModule: true,
    default: (props: Record<string, unknown>) => (
      <View testID="date-picker" {...props} />
    ),
  };
});

describe('InputField yymmdd type', () => {
  it('displays formatted date from YYMMDD string', () => {
    render(
      <InputField type="yymmdd" label="Date of birth" value="900117" />,
    );

    expect(screen.getByText('Jan 17 1990')).toBeTruthy();
  });

  it('displays correct date for year <= 30 (2000s)', () => {
    render(
      <InputField type="yymmdd" label="Expiry" value="301231" />,
    );

    expect(screen.getByText('Dec 31 2030')).toBeTruthy();
  });

  it('updates display when value prop changes', () => {
    const { rerender } = render(
      <InputField type="yymmdd" label="Date of birth" value="900117" />,
    );

    expect(screen.getByText('Jan 17 1990')).toBeTruthy();

    rerender(
      <InputField type="yymmdd" label="Date of birth" value="950625" />,
    );

    expect(screen.getByText('Jun 25 1995')).toBeTruthy();
  });
});
