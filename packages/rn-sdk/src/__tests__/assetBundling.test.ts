// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as fs from 'node:fs';
import { Platform } from 'react-native';

import { resolveBundlePath } from '../bundlePath';

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

  const toFileUri = (path: string) =>
    path.startsWith('file://') ? path : `file://${path}`;

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

    const iosSource = (
      rnfsMainBundlePath?: unknown,
      bundleRootUri?: unknown,
    ) => {
      const mainBundlePath = resolveBundlePath(rnfsMainBundlePath, bundleRootUri);
      return Platform.select({
        android: { uri: 'file:///android_asset/self-wallet/index.html' },
        ios: {
          uri: mainBundlePath
            ? toFileUri(`${mainBundlePath}/self-wallet/index.html`)
            : 'self-wallet/index.html',
        },
      });
    };

    it('iOS source resolves to RNFS absolute path when available', () => {
      mockOS = 'ios';
      expect(
        iosSource('/var/containers/Bundle/Application/ABC/MyApp.app'),
      ).toEqual({
        uri: 'file:///var/containers/Bundle/Application/ABC/MyApp.app/self-wallet/index.html',
      });
    });

    it('iOS source resolves to host-injected bundleRootUri when RNFS native is unlinked', () => {
      mockOS = 'ios';
      // RNFS JS resolves but the native MainBundlePath constant is undefined;
      // the Expo host injects bundleRootUri instead.
      expect(
        iosSource(
          undefined,
          'file:///var/containers/Bundle/Application/ABC/MyApp.app/',
        ),
      ).toEqual({
        uri: 'file:///var/containers/Bundle/Application/ABC/MyApp.app/self-wallet/index.html',
      });
    });

    it('iOS source falls back to relative path when no provider supplies a bundle path', () => {
      mockOS = 'ios';
      expect(iosSource(undefined, undefined)).toEqual({
        uri: 'self-wallet/index.html',
      });
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
    it('package.json files array includes dist and assets', () => {
      const pkg = JSON.parse(fs.readFileSync(new URL('../../package.json', import.meta.url), 'utf-8'));
      expect(pkg.files).toContain('dist');
      expect(pkg.files).toContain('assets');
    });
  });
});
