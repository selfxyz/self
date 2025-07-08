// SPDX-License-Identifier: BUSL-1.1; Copyright (c) 2025 Social Connect Labs, Inc.; Licensed under BUSL-1.1 (see LICENSE); Apache-2.0 from 2029-06-11

/**
 * @jest-environment node
 */

import * as fs from 'fs';
import * as path from 'path';

describe('iOS Info.plist Configuration', () => {
  const plistPath = path.join(__dirname, '../../ios/OpenPassport/Info.plist');
  let plistContent: string;

  beforeAll(() => {
    plistContent = fs.readFileSync(plistPath, 'utf8');
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
    expect(plistContent).toContain('<string>DINOT-Medium.otf</string>');
  });
});
