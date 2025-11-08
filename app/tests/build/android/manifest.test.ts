// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

/**
 * @jest-environment node
 */

import { readFileSync } from 'fs';
import { join } from 'path';

describe('Android Manifest Configuration', () => {
  const manifestPath = join(
    __dirname,
    '../../../android/app/src/main/AndroidManifest.xml',
  );
  let manifestContent: string;

  beforeAll(() => {
    // Read the manifest file
    manifestContent = readFileSync(manifestPath, 'utf8');
  });

  describe('Critical Deeplink Configuration', () => {
    it('should contain the redirect.self.xyz deeplink intent filter', () => {
      // This is the configuration that was accidentally deleted
      expect(manifestContent).toContain('android:host="redirect.self.xyz"');
      expect(manifestContent).toContain('android:autoVerify="true"');
      expect(manifestContent).toContain('android.intent.action.VIEW');
      expect(manifestContent).toContain('android.intent.category.BROWSABLE');
      expect(manifestContent).toContain('android:scheme="https"');
    });

    it('should have the deeplink intent filter in the MainActivity', () => {
      // Ensure the deeplink is properly configured in the main activity
      const mainActivityMatch = manifestContent.match(
        /<activity[^>]*android:name="\.MainActivity"[^>]*>(.*?)<\/activity>/s,
      );

      expect(mainActivityMatch).toBeTruthy();
      expect(mainActivityMatch![1]).toContain('redirect.self.xyz');
      expect(mainActivityMatch![1]).toContain('android:autoVerify="true"');
    });
  });

  describe('Firebase Configuration', () => {
    it('should have Firebase Messaging Service configured', () => {
      expect(manifestContent).toContain(
        'com.google.firebase.messaging.FirebaseMessagingService',
      );
      expect(manifestContent).toContain('com.google.firebase.MESSAGING_EVENT');
    });

    it('should have Firebase metadata configurations', () => {
      const firebaseMetaConfigs = [
        'com.google.firebase.messaging.default_notification_channel_id',
        'com.google.firebase.messaging.default_notification_icon',
        'com.google.firebase.messaging.default_notification_color',
      ];

      firebaseMetaConfigs.forEach(config => {
        expect(manifestContent).toContain(`android:name="${config}"`);
      });
    });

    it('should have Firebase service properly exported', () => {
      // Firebase service should not be exported for security
      const serviceMatch = manifestContent.match(
        /<service[^>]*android:name="com\.google\.firebase\.messaging\.FirebaseMessagingService"[^>]*>/,
      );
      expect(serviceMatch).toBeTruthy();
      expect(serviceMatch![0]).toContain('android:exported="false"');
    });
  });

  describe('OAuth/AppAuth Configuration', () => {
    it('should have AppAuth RedirectUriReceiverActivity configured', () => {
      expect(manifestContent).toContain(
        'net.openid.appauth.RedirectUriReceiverActivity',
      );
      expect(manifestContent).toContain('${appAuthRedirectScheme}');
      expect(manifestContent).toContain('oauth2redirect');
    });

    it('should have OAuth activity properly exported', () => {
      const oauthActivityMatch = manifestContent.match(
        /<activity[^>]*android:name="net\.openid\.appauth\.RedirectUriReceiverActivity"[^>]*>/,
      );
      expect(oauthActivityMatch).toBeTruthy();
      expect(oauthActivityMatch![0]).toContain('android:exported="true"');
    });
  });

  describe('NFC Configuration', () => {
    it('should have NFC permission', () => {
      expect(manifestContent).toContain('android.permission.NFC');
    });

    it('should have NFC tech discovery metadata', () => {
      expect(manifestContent).toContain('android.nfc.action.TECH_DISCOVERED');
      expect(manifestContent).toContain('@xml/nfc_tech_filter');
    });
  });

  describe('Required Permissions', () => {
    const criticalPermissions = [
      'android.permission.INTERNET',
      'android.permission.CAMERA',
      'android.permission.NFC',
      'android.permission.VIBRATE',
      'android.permission.POST_NOTIFICATIONS',
      'android.permission.ACCESS_SURFACE_FLINGER',
      'android.permission.RECEIVE_BOOT_COMPLETED',
    ];

    criticalPermissions.forEach(permission => {
      it(`should contain ${permission} permission`, () => {
        expect(manifestContent).toContain(`android:name="${permission}"`);
      });
    });
  });

  describe('Main Activity Configuration', () => {
    it('should have MainActivity properly configured', () => {
      expect(manifestContent).toContain('android:name=".MainActivity"');
      expect(manifestContent).toContain('android:exported="true"');
      expect(manifestContent).toContain('android:launchMode="singleTop"');
      // Orientation locks removed to support large screens
      expect(manifestContent).not.toContain('android:screenOrientation');
    });

    it('should have main launcher intent filter', () => {
      expect(manifestContent).toContain('android.intent.action.MAIN');
      expect(manifestContent).toContain('android.intent.category.LAUNCHER');
    });

    it('should have proper config changes handled', () => {
      const configChanges = [
        'keyboard',
        'keyboardHidden',
        'orientation',
        'screenLayout',
        'screenSize',
        'smallestScreenSize',
        'uiMode',
      ];

      configChanges.forEach(change => {
        expect(manifestContent).toContain(change);
      });
    });
  });

  describe('Application Configuration', () => {
    it('should have MainApplication configured', () => {
      expect(manifestContent).toContain('android:name=".MainApplication"');
      expect(manifestContent).toContain('android:largeHeap="true"');
      expect(manifestContent).toContain('android:supportsRtl="true"');
    });

    it('should have proper theme and icons configured', () => {
      expect(manifestContent).toContain('@style/AppTheme');
      expect(manifestContent).toContain('@mipmap/ic_launcher');
    });
  });

  describe('Manifest Structure Validation', () => {
    it('should be valid XML structure', () => {
      // Basic XML validation - ensure it has proper opening/closing tags
      expect(manifestContent).toMatch(/^<manifest[^>]*>/);
      expect(manifestContent).toContain('</manifest>');
      expect(manifestContent).toContain('<application');
      expect(manifestContent).toContain('</application>');
    });

    it('should have required namespaces', () => {
      expect(manifestContent).toContain(
        'xmlns:android="http://schemas.android.com/apk/res/android"',
      );
      expect(manifestContent).toContain(
        'xmlns:tools="http://schemas.android.com/tools"',
      );
    });
  });
});
