// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import { describe, expect, it } from '@jest/globals';

import * as links from '@/consts/links';

describe('links', () => {
  describe('URL format validation', () => {
    it('should export only valid HTTPS URLs', () => {
      const allLinks = Object.entries(links);

      allLinks.forEach(([_name, url]) => {
        expect(url).toMatch(/^https:\/\/.+/);
        expect(url).not.toContain(' ');
        // Ensure no trailing slashes (consistency)
        expect(url).not.toMatch(/\/$/);
      });
    });

    it('should have unique URLs (no duplicates)', () => {
      const allUrls = Object.values(links);
      const uniqueUrls = new Set(allUrls);

      expect(uniqueUrls.size).toBe(allUrls.length);
    });
  });

  describe('Critical URL validation', () => {
    it('should have correct Telegram URL', () => {
      expect(links.telegramUrl).toBe('https://t.me/selfxyz');
    });

    it('should have correct Discord URL', () => {
      expect(links.discordUrl).toBe('https://discord.gg/selfxyz');
    });

    it('should have correct GitHub URL', () => {
      expect(links.gitHubUrl).toBe('https://github.com/selfxyz/self');
    });

    it('should have correct X (Twitter) URL', () => {
      expect(links.xUrl).toBe('https://x.com/selfprotocol');
    });

    it('should have correct Self main URL', () => {
      expect(links.selfUrl).toBe('https://self.xyz');
    });

    it('should have correct privacy policy URL', () => {
      expect(links.privacyUrl).toBe('https://self.xyz/privacy');
    });

    it('should have correct terms URL', () => {
      expect(links.termsUrl).toBe('https://self.xyz/terms');
    });
  });

  describe('Self platform URLs', () => {
    it('should use self.xyz domain for platform URLs', () => {
      expect(links.selfUrl).toContain('self.xyz');
      expect(links.privacyUrl).toContain('self.xyz');
      expect(links.termsUrl).toContain('self.xyz');
      expect(links.appsUrl).toContain('self.xyz');
      expect(links.referralBaseUrl).toContain('self.xyz');
      expect(links.apiBaseUrl).toContain('self.xyz');
      expect(links.pointsApiBaseUrl).toContain('self.xyz');
      expect(links.notificationApiUrl).toContain('self.xyz');
    });
  });

  describe('App store URLs', () => {
    it('should have valid App Store URL', () => {
      expect(links.appStoreUrl).toMatch(/^https:\/\/apps\.apple\.com\//);
      expect(links.appStoreUrl).toContain('id6478563710');
    });

    it('should have valid Play Store URL', () => {
      expect(links.playStoreUrl).toMatch(
        /^https:\/\/play\.google\.com\/store\//,
      );
      expect(links.playStoreUrl).toContain('com.proofofpassportapp');
    });
  });

  describe('OAuth URLs', () => {
    it('should have valid Google OAuth endpoints', () => {
      expect(links.googleOAuthAuthorizationEndpoint).toBe(
        'https://accounts.google.com/o/oauth2/v2/auth',
      );
      expect(links.googleOAuthTokenEndpoint).toBe(
        'https://oauth2.googleapis.com/token',
      );
    });

    it('should have valid Turnkey redirect URIs', () => {
      expect(links.turnkeyOAuthRedirectAndroidUri).toContain('self.xyz');
      expect(links.turnkeyOAuthRedirectIosUri).toContain('turnkey.com');
    });
  });

  describe('Export completeness', () => {
    it('should export at least 20 links', () => {
      // Ensures we don't accidentally remove links
      const linkCount = Object.keys(links).length;
      expect(linkCount).toBeGreaterThanOrEqual(20);
    });

    it('should have descriptive variable names', () => {
      const allLinks = Object.keys(links);

      allLinks.forEach(name => {
        // Should be camelCase
        expect(name).toMatch(/^[a-z][a-zA-Z0-9]*$/);
        // Should end with Url, Uri, Endpoint, or Scope
        const isValid =
          name.endsWith('Url') ||
          name.endsWith('Uri') ||
          name.endsWith('Endpoint') ||
          name.endsWith('Scope');
        if (!isValid) {
          console.log(`Invalid variable name: ${name}`);
        }
        expect(isValid).toBe(true);
      });
    });
  });
});
