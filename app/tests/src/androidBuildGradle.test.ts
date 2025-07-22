// SPDX-License-Identifier: BUSL-1.1; Copyright (c) 2025 Social Connect Labs, Inc.; Licensed under BUSL-1.1 (see LICENSE); Apache-2.0 from 2029-06-11

/**
 * @jest-environment node
 */

import * as fs from 'fs';
import * as path from 'path';

describe('Android build.gradle Configuration', () => {
  const gradlePath = path.join(__dirname, '../../android/app/build.gradle');
  const rootGradlePath = path.join(__dirname, '../../android/build.gradle');
  let gradleContent: string;
  let rootGradleContent: string;

  beforeAll(() => {
    gradleContent = fs.readFileSync(gradlePath, 'utf8');
    rootGradleContent = fs.readFileSync(rootGradlePath, 'utf8');
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
    expect(rootGradleContent).toMatch(/minSdkVersion\s*=\s*23/);
    expect(rootGradleContent).toMatch(/targetSdkVersion\s*=\s*35/);
  });

  it('includes Firebase messaging dependency', () => {
    expect(gradleContent).toContain('com.google.firebase:firebase-messaging');
  });
});
