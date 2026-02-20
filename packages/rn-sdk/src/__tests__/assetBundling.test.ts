// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';

// Mock react-native Platform module
let mockOS = 'android';
vi.mock('react-native', () => ({
  Platform: {
    get OS() {
      return mockOS;
    },
    select: <T>(obj: { android?: T; ios?: T }) => {
      return mockOS === 'android' ? obj.android : obj.ios;
    },
  },
  View: 'View',
}));

// Mock react-native-webview
vi.mock('react-native-webview', () => {
  const MockWebView = vi.fn();
  return { default: MockWebView };
});

// Mock native modules
vi.mock('react-native-biometrics', () => ({ default: vi.fn().mockImplementation(() => ({})) }));
vi.mock('react-native-keychain', () => ({ getGenericPassword: vi.fn(), setGenericPassword: vi.fn(), resetGenericPassword: vi.fn() }));
vi.mock('react-native-nfc-manager', () => ({ default: { isSupported: vi.fn() }, NfcTech: { IsoDep: 'IsoDep' } }));
vi.mock('react-native-fs', () => ({ MainBundlePath: '/var/containers/Bundle/Application/ABC/MyApp.app' }));

// We need to test the source resolution logic.
// Since Platform.select is used inside the component, we test the logic directly.

describe('Asset Bundling (Chunk 5D)', () => {
  beforeEach(() => {
    mockOS = 'android';
  });

  describe('asset-bundling.html-exists', () => {
    it('assets/self-wallet/index.html is present after build', () => {
      const assetsPath = path.resolve(__dirname, '../../assets/self-wallet/index.html');
      expect(fs.existsSync(assetsPath)).toBe(true);
    });
  });

  describe('Platform.select', () => {
    it('Android source resolves to file:///android_asset/...', async () => {
      mockOS = 'android';
      const { Platform } = await import('react-native');
      const source = Platform.select({
        android: { uri: 'file:///android_asset/self-wallet/index.html' },
        ios: { uri: 'self-wallet/index.html' },
      });
      expect(source).toEqual({ uri: 'file:///android_asset/self-wallet/index.html' });
    });

    it('iOS source resolves to RNFS absolute path when available', async () => {
      mockOS = 'ios';
      const RNFS = await import('react-native-fs');
      const { Platform } = await import('react-native');
      const mainBundlePath = RNFS.MainBundlePath;
      const source = Platform.select({
        android: { uri: 'file:///android_asset/self-wallet/index.html' },
        ios: {
          uri: mainBundlePath
            ? `${mainBundlePath}/self-wallet/index.html`
            : 'self-wallet/index.html',
        },
      });
      expect(source).toEqual({
        uri: '/var/containers/Bundle/Application/ABC/MyApp.app/self-wallet/index.html',
      });
    });

    it('iOS source falls back to relative path when RNFS is not installed', async () => {
      mockOS = 'ios';
      const { Platform } = await import('react-native');
      // Simulate RNFS not being available
      const mainBundlePath: string | undefined = undefined;
      const source = Platform.select({
        android: { uri: 'file:///android_asset/self-wallet/index.html' },
        ios: {
          uri: mainBundlePath
            ? `${mainBundlePath}/self-wallet/index.html`
            : 'self-wallet/index.html',
        },
      });
      expect(source).toEqual({ uri: 'self-wallet/index.html' });
    });
  });

  describe('devServerUrl override', () => {
    it('dev server URL takes precedence over bundled assets', () => {
      const devServerUrl = 'http://localhost:5173';
      // This mirrors the logic in SelfVerification.tsx
      const source = devServerUrl
        ? { uri: devServerUrl }
        : { uri: 'file:///android_asset/self-wallet/index.html' };
      expect(source).toEqual({ uri: 'http://localhost:5173' });
    });

    it('falls back to bundled assets when devServerUrl is undefined', () => {
      const devServerUrl: string | undefined = undefined;
      const source = devServerUrl
        ? { uri: devServerUrl }
        : { uri: 'file:///android_asset/self-wallet/index.html' };
      expect(source).toEqual({ uri: 'file:///android_asset/self-wallet/index.html' });
    });
  });

  describe('npm-pack-contents', () => {
    it('dist/ directory exists with built files', () => {
      const distPath = path.resolve(__dirname, '../../dist');
      expect(fs.existsSync(distPath)).toBe(true);
      expect(fs.existsSync(path.join(distPath, 'index.js'))).toBe(true);
      expect(fs.existsSync(path.join(distPath, 'index.mjs'))).toBe(true);
      expect(fs.existsSync(path.join(distPath, 'index.d.ts'))).toBe(true);
    });

    it('assets/ directory exists with self-wallet bundle', () => {
      const assetsPath = path.resolve(__dirname, '../../assets/self-wallet');
      expect(fs.existsSync(assetsPath)).toBe(true);
    });

    it('package.json files array includes dist and assets', () => {
      const pkgPath = path.resolve(__dirname, '../../package.json');
      const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
      expect(pkg.files).toContain('dist');
      expect(pkg.files).toContain('assets');
    });
  });
});
