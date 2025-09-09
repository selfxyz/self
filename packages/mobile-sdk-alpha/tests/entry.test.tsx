// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

/* @vitest-environment jsdom */
import React from 'react';
import { describe, expect, it } from 'vitest';

import { SelfMobileSdk, useSelfClient } from '../src/index';
import { expectedMRZResult, mockAdapters, sampleMRZ } from './utils/testHelpers';

import { render, screen } from '@testing-library/react';

function Consumer() {
  const client = useSelfClient();
  const info = client.extractMRZInfo(sampleMRZ);
  return <span>{info.documentNumber}</span>;
}

describe('SelfMobileSdk Entry Component', () => {
  it('provides client to children and enables MRZ parsing', () => {
    render(
      <SelfMobileSdk config={{}} adapters={mockAdapters} listeners={new Map()}>
        <Consumer />
      </SelfMobileSdk>,
    );

    expect(screen.getByText(expectedMRZResult.documentNumber)).toBeTruthy();
  });

  it('renders children correctly', () => {
    const testMessage = 'Test Child Component';
    render(
      <SelfMobileSdk config={{}} adapters={mockAdapters} listeners={new Map()}>
        <div>{testMessage}</div>
      </SelfMobileSdk>,
    );

    expect(screen.getByText(testMessage)).toBeTruthy();
  });
});
