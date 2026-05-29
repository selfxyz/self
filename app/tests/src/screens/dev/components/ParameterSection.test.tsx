// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import { render } from '@testing-library/react-native';

import { ParameterSection } from '@/screens/dev/components/ParameterSection';

describe('ParameterSection', () => {
  it('ignores a truthy icon function that does not return a valid element', () => {
    const icon = (() => 'not-an-element') as any;

    expect(() =>
      render(
        <ParameterSection
          icon={icon}
          title="Title"
          description="Description"
        />,
      ),
    ).not.toThrow();
  });
});
