// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

/**
 * @jest-environment node
 */

import { readFileSync } from 'fs';
import { join } from 'path';

describe('iOS project.pbxproj Configuration', () => {
  const projectPath = join(
    __dirname,
    '../../../ios/Self.xcodeproj/project.pbxproj',
  );
  let projectContent: string;

  beforeAll(() => {
    try {
      projectContent = readFileSync(projectPath, 'utf8');
    } catch (error) {
      throw new Error(
        `Failed to read iOS project file at ${projectPath}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  });

  it('uses the correct bundle identifier', () => {
    expect(projectContent).toMatch(
      /PRODUCT_BUNDLE_IDENTIFIER\s*=\s*com\.warroom\.proofofpassport;/,
    );
  });

  it('has the expected development team set', () => {
    expect(projectContent).toMatch(/DEVELOPMENT_TEAM\s*=\s*5B29R5LYHQ;/);
  });

  it('includes GoogleService-Info.plist in resources', () => {
    expect(projectContent).toContain('GoogleService-Info.plist in Resources');
  });
});
