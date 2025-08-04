// SPDX-License-Identifier: BUSL-1.1; Copyright (c) 2025 Social Connect Labs, Inc.; Licensed under BUSL-1.1 (see LICENSE); Apache-2.0 from 2029-06-11

// eslint-disable-next-line import/no-unresolved
import { by, device, element, expect } from 'detox';

describe('App launch', () => {
  beforeAll(async () => {
    await device.launchApp({ delete: true });
  });

  it('shows launch or home screen', async () => {
    try {
      await expect(element(by.id('launch-screen'))).toBeVisible();
    } catch {
      await expect(element(by.id('home-screen'))).toBeVisible();
    }
  });
});
