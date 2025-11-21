// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

/**
 * @jest-environment node
 */

import { readFileSync } from 'fs';
import { join } from 'path';

describe('iOS Info.plist Configuration', () => {
  const plistPath = join(__dirname, '../../../ios/OpenPassport/Info.plist');
  let plistContent: string;

  beforeAll(() => {
    plistContent = readFileSync(plistPath, 'utf8');
  });

  it('contains the proofofpassport URL scheme', () => {
    const regex =
      /<key>CFBundleURLSchemes<\/key>\s*<array>\s*<string>proofofpassport<\/string>/s;
    expect(plistContent).toMatch(regex);
  });

  it('has NFC and camera usage descriptions', () => {
    expect(plistContent).toContain('<key>NFCReaderUsageDescription</key>');
    expect(plistContent).toContain('<key>NSCameraUsageDescription</key>');
  });

  it('lists required fonts', () => {
    expect(plistContent).toContain('<string>Advercase-Regular.otf</string>');
    expect(plistContent).toContain('<string>DINOT-Bold.otf</string>');
    expect(plistContent).toContain('<string>DINOT-Medium.otf</string>');
  });
});
