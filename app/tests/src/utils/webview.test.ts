// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import {
  ALWAYS_OPEN_EXTERNALLY,
  isAllowedAboutUrl,
  isHostnameMatch,
  isSameOrigin,
  isTrustedDomain,
  shouldAlwaysOpenExternally,
  TRUSTED_DOMAINS,
} from '@/utils/webview';

describe('webview utilities', () => {
  describe('isHostnameMatch', () => {
    it('should match exact domain', () => {
      expect(isHostnameMatch('https://example.com', 'example.com')).toBe(true);
      expect(isHostnameMatch('https://example.com/', 'example.com')).toBe(true);
      expect(isHostnameMatch('https://example.com/path', 'example.com')).toBe(
        true,
      );
      expect(
        isHostnameMatch('https://example.com/path?query=1', 'example.com'),
      ).toBe(true);
    });

    it('should match subdomains', () => {
      expect(isHostnameMatch('https://sub.example.com', 'example.com')).toBe(
        true,
      );
      expect(
        isHostnameMatch('https://sub.sub.example.com', 'example.com'),
      ).toBe(true);
      expect(isHostnameMatch('https://www.example.com', 'example.com')).toBe(
        true,
      );
    });

    it('should NOT match domain in query parameters (spoofing attempt)', () => {
      expect(
        isHostnameMatch('https://evil.com/?next=example.com', 'example.com'),
      ).toBe(false);
      expect(
        isHostnameMatch(
          'https://evil.com/path?redirect=example.com',
          'example.com',
        ),
      ).toBe(false);
      expect(
        isHostnameMatch('https://attacker.com#example.com', 'example.com'),
      ).toBe(false);
    });

    it('should NOT match domain in path (spoofing attempt)', () => {
      expect(
        isHostnameMatch('https://evil.com/example.com', 'example.com'),
      ).toBe(false);
      expect(
        isHostnameMatch('https://evil.com/path/example.com', 'example.com'),
      ).toBe(false);
    });

    it('should NOT match similar but different domains', () => {
      expect(isHostnameMatch('https://example.org', 'example.com')).toBe(false);
      expect(isHostnameMatch('https://notexample.com', 'example.com')).toBe(
        false,
      );
      expect(
        isHostnameMatch('https://example.com.evil.com', 'example.com'),
      ).toBe(false);
      expect(isHostnameMatch('https://fakeexample.com', 'example.com')).toBe(
        false,
      );
    });

    it('should handle malformed URLs gracefully', () => {
      expect(isHostnameMatch('not a url', 'example.com')).toBe(false);
      expect(isHostnameMatch('', 'example.com')).toBe(false);
      // eslint-disable-next-line no-script-url
      expect(isHostnameMatch('javascript:alert(1)', 'example.com')).toBe(false);
      expect(isHostnameMatch('ftp://example.com', 'example.com')).toBe(true); // valid URL, different protocol
    });

    it('should be case-insensitive for hostnames', () => {
      expect(isHostnameMatch('https://Example.COM', 'example.com')).toBe(true);
      expect(isHostnameMatch('https://EXAMPLE.COM', 'example.com')).toBe(true);
    });

    describe('WalletConnect spoofing protection', () => {
      it('should match legitimate WalletConnect URLs', () => {
        expect(
          isHostnameMatch(
            'https://verify.walletconnect.org/v3/attestation',
            'verify.walletconnect.org',
          ),
        ).toBe(true);
        expect(
          isHostnameMatch(
            'https://verify.walletconnect.org/path?query=1',
            'verify.walletconnect.org',
          ),
        ).toBe(true);
      });

      it('should NOT match spoofed WalletConnect URLs', () => {
        expect(
          isHostnameMatch(
            'https://evil.com/?next=verify.walletconnect.org',
            'verify.walletconnect.org',
          ),
        ).toBe(false);
        expect(
          isHostnameMatch(
            'https://evil.com/verify.walletconnect.org',
            'verify.walletconnect.org',
          ),
        ).toBe(false);
        expect(
          isHostnameMatch(
            'https://verify.walletconnect.org.evil.com',
            'verify.walletconnect.org',
          ),
        ).toBe(false);
      });
    });

    describe('Aave spoofing protection', () => {
      it('should match legitimate Aave URLs', () => {
        expect(isHostnameMatch('https://app.aave.com', 'app.aave.com')).toBe(
          true,
        );
        expect(
          isHostnameMatch('https://app.aave.com/markets', 'app.aave.com'),
        ).toBe(true);
      });

      it('should NOT match spoofed Aave URLs', () => {
        expect(
          isHostnameMatch(
            'https://evil.com/?redirect=app.aave.com',
            'app.aave.com',
          ),
        ).toBe(false);
        expect(
          isHostnameMatch('https://evil.com/app.aave.com', 'app.aave.com'),
        ).toBe(false);
        expect(
          isHostnameMatch('https://app.aave.com.evil.com', 'app.aave.com'),
        ).toBe(false);
      });
    });
  });

  describe('isTrustedDomain', () => {
    it('should match domains from TRUSTED_DOMAINS list', () => {
      TRUSTED_DOMAINS.forEach(domain => {
        expect(isTrustedDomain(`https://${domain}`)).toBe(true);
        expect(isTrustedDomain(`https://www.${domain}`)).toBe(true);
      });
    });

    it('should not match untrusted domains', () => {
      expect(isTrustedDomain('https://evil.com')).toBe(false);
      expect(isTrustedDomain('https://attacker.org')).toBe(false);
    });
  });

  describe('shouldAlwaysOpenExternally', () => {
    it('should match domains from ALWAYS_OPEN_EXTERNALLY list', () => {
      ALWAYS_OPEN_EXTERNALLY.forEach(domain => {
        expect(shouldAlwaysOpenExternally(`https://${domain}`)).toBe(true);
        expect(shouldAlwaysOpenExternally(`https://www.${domain}`)).toBe(true);
      });
    });

    it('should not match other domains', () => {
      expect(shouldAlwaysOpenExternally('https://example.com')).toBe(false);
    });
  });

  describe('Policy: keys.coinbase.com always opens externally', () => {
    it('should be in ALWAYS_OPEN_EXTERNALLY list', () => {
      expect(ALWAYS_OPEN_EXTERNALLY).toContain('keys.coinbase.com');
    });

    it('should NOT be in TRUSTED_DOMAINS list (policy conflict prevention)', () => {
      expect(TRUSTED_DOMAINS).not.toContain('keys.coinbase.com');
    });

    it('should return true for shouldAlwaysOpenExternally', () => {
      expect(shouldAlwaysOpenExternally('https://keys.coinbase.com')).toBe(
        true,
      );
      expect(
        shouldAlwaysOpenExternally('https://keys.coinbase.com/connect'),
      ).toBe(true);
      expect(
        shouldAlwaysOpenExternally('https://keys.coinbase.com/path?query=1'),
      ).toBe(true);
    });

    it('should return false for isTrustedDomain', () => {
      expect(isTrustedDomain('https://keys.coinbase.com')).toBe(false);
      expect(isTrustedDomain('https://keys.coinbase.com/connect')).toBe(false);
    });

    it('should correctly identify that keys.coinbase.com cannot be a trusted entrypoint', () => {
      // Verify the policy: if a domain should always open externally,
      // it cannot be trusted in the WebView
      const url = 'https://keys.coinbase.com/wallet';
      expect(shouldAlwaysOpenExternally(url)).toBe(true);
      expect(isTrustedDomain(url)).toBe(false);
    });
  });

  describe('isAllowedAboutUrl', () => {
    it('should allow about:blank and about:srcdoc', () => {
      expect(isAllowedAboutUrl('about:blank')).toBe(true);
      expect(isAllowedAboutUrl('about:srcdoc')).toBe(true);
      expect(isAllowedAboutUrl('ABOUT:BLANK')).toBe(true);
      expect(isAllowedAboutUrl('ABOUT:SRCDOC')).toBe(true);
    });

    it('should not allow other about: URLs', () => {
      expect(isAllowedAboutUrl('about:config')).toBe(false);
      expect(isAllowedAboutUrl('about:plugins')).toBe(false);
    });
  });

  describe('isSameOrigin', () => {
    it('should return true for same origin URLs', () => {
      expect(
        isSameOrigin('https://example.com/path1', 'https://example.com/path2'),
      ).toBe(true);
      expect(
        isSameOrigin('https://example.com:443/', 'https://example.com/'),
      ).toBe(true);
    });

    it('should return false for different origins', () => {
      expect(isSameOrigin('https://example.com', 'https://other.com')).toBe(
        false,
      );
      expect(isSameOrigin('https://example.com', 'http://example.com')).toBe(
        false,
      );
      expect(
        isSameOrigin('https://example.com:443', 'https://example.com:8443'),
      ).toBe(false);
    });

    it('should handle malformed URLs gracefully', () => {
      expect(isSameOrigin('not a url', 'https://example.com')).toBe(false);
      expect(isSameOrigin('https://example.com', 'not a url')).toBe(false);
    });
  });
});
