// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

/**
 * @jest-environment node
 */

import { readFileSync } from 'fs';
import { join } from 'path';

describe('Android build.gradle Configuration', () => {
  const gradlePath = join(__dirname, '../../../android/app/build.gradle');
  const rootGradlePath = join(__dirname, '../../../android/build.gradle');
  let gradleContent: string;
  let rootGradleContent: string;

  beforeAll(() => {
    gradleContent = readFileSync(gradlePath, 'utf8');
    rootGradleContent = readFileSync(rootGradlePath, 'utf8');
  });

  it('references SDK versions from the root project', () => {
    expect(gradleContent).toMatch(
      /minSdkVersion\s+rootProject\.ext\.minSdkVersion/,
    );
    expect(gradleContent).toMatch(
      /targetSdkVersion\s+rootProject\.ext\.targetSdkVersion/,
    );
  });

  it('sets the expected SDK version numbers', () => {
    expect(rootGradleContent).toMatch(/minSdkVersion\s*=\s*24/);
    expect(rootGradleContent).toMatch(/targetSdkVersion\s*=\s*36/);
  });

  it('includes Firebase messaging dependency', () => {
    expect(gradleContent).toContain('com.google.firebase:firebase-messaging');
  });
});
