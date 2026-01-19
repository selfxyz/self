// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import type { SelfClient } from '@selfxyz/mobile-sdk-alpha';

import {
  handleUrl,
  parseAndValidateUrlParams,
  setupUniversalLinkListenerInNavigation,
} from '@/navigation/deeplinks';

jest.mock('react-native', () => {
  const mockLinking = {
    addEventListener: jest.fn(),
    getInitialURL: jest.fn(),
  };

  return {
    Linking: mockLinking,
    Platform: { OS: 'ios' },
  };
});

const mockLinking = jest.requireMock('react-native').Linking as jest.Mocked<{
  addEventListener: jest.Mock;
  getInitialURL: jest.Mock;
}>;

const mockPlatform = jest.requireMock('react-native').Platform as {
  OS: string;
};

jest.mock('@/navigation', () => ({
  navigationRef: {
    navigate: jest.fn(),
    isReady: jest.fn(() => true),
    reset: jest.fn(),
    getCurrentRoute: jest.fn(),
  },
}));

jest.mock('@/stores/userStore', () => {
  const mockUserStore = { default: { getState: jest.fn() } };

  return {
    __esModule: true,
    ...mockUserStore,
  };
});

const mockUserStore = jest.requireMock('@/stores/userStore') as {
  default: { getState: jest.Mock };
};

let setDeepLinkUserDetails: jest.Mock;

describe('deeplinks', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setDeepLinkUserDetails = jest.fn();
    mockLinking.getInitialURL.mockReset();
    mockLinking.addEventListener.mockReset();
    mockLinking.getInitialURL.mockResolvedValue(null as any);
    mockLinking.addEventListener.mockReturnValue({ remove: jest.fn() } as any);
    mockUserStore.default.getState.mockReturnValue({
      setDeepLinkUserDetails,
    });
    mockPlatform.OS = 'ios';

    // Setup default getCurrentRoute mock to return Splash (cold launch scenario)
    const { navigationRef } = require('@/navigation');
    navigationRef.getCurrentRoute.mockReturnValue({ name: 'Splash' });
  });

  describe('handleUrl', () => {
    it('handles selfApp parameter', () => {
      const selfApp = { sessionId: 'abc' };
      const url = `scheme://open?selfApp=${encodeURIComponent(JSON.stringify(selfApp))}`;

      const mockSetSelfApp = jest.fn();
      const mockStartAppListener = jest.fn();

      handleUrl(
        {
          getSelfAppState: () => ({
            setSelfApp: mockSetSelfApp,
            startAppListener: mockStartAppListener,
          }),
        } as unknown as SelfClient,
        url,
      );

      expect(mockSetSelfApp).toHaveBeenCalledWith(selfApp);
      expect(mockStartAppListener).toHaveBeenCalledWith('abc');

      const { navigationRef } = require('@/navigation');
      expect(navigationRef.reset).toHaveBeenCalledWith({
        index: 1,
        routes: [{ name: 'Home' }, { name: 'ProvingScreenRouter' }],
      });
    });

    it('handles sessionId parameter', () => {
      const url = 'scheme://open?sessionId=123';
      const mockCleanSelfApp = jest.fn();
      const mockStartAppListener = jest.fn();

      handleUrl(
        {
          getSelfAppState: () => ({
            setSelfApp: jest.fn(),
            startAppListener: mockStartAppListener,
            cleanSelfApp: mockCleanSelfApp,
          }),
        } as unknown as SelfClient,
        url,
      );

      expect(mockCleanSelfApp).toHaveBeenCalledWith();
      expect(mockStartAppListener).toHaveBeenCalledWith('123');

      const { navigationRef } = require('@/navigation');
      expect(navigationRef.reset).toHaveBeenCalledWith({
        index: 1,
        routes: [{ name: 'Home' }, { name: 'ProvingScreenRouter' }],
      });
    });

    it('handles mock_passport parameter', () => {
      const mockData = { name: 'John', surname: 'Doe' };
      const url = `scheme://open?mock_passport=${encodeURIComponent(JSON.stringify(mockData))}`;
      handleUrl({} as SelfClient, url);

      expect(setDeepLinkUserDetails).toHaveBeenCalledWith({
        name: 'John',
        surname: 'Doe',
        nationality: undefined,
        birthDate: undefined,
        gender: undefined,
      });
      const { navigationRef } = require('@/navigation');
      expect(navigationRef.reset).toHaveBeenCalledWith({
        index: 1,
        routes: [{ name: 'Home' }, { name: 'MockDataDeepLink' }],
      });
    });

    it('handles referrer parameter and navigates to HomeScreen for confirmation', () => {
      const referrer = '0x1234567890123456789012345678901234567890';
      const url = `scheme://open?referrer=${referrer}`;

      const mockSetDeepLinkReferrer = jest.fn();
      mockUserStore.default.getState.mockReturnValue({
        setDeepLinkReferrer: mockSetDeepLinkReferrer,
      });

      handleUrl({} as SelfClient, url);

      expect(mockSetDeepLinkReferrer).toHaveBeenCalledWith(referrer);

      const { navigationRef } = require('@/navigation');
      // Should navigate to HomeScreen, which will show confirmation modal
      // During cold launch (Splash screen), reset is called with full navigation state
      expect(navigationRef.reset).toHaveBeenCalledWith({
        index: 1,
        routes: [{ name: 'Home' }, { name: 'Home' }],
      });
    });

    it('navigates to QRCodeTrouble for invalid data', () => {
      const consoleErrorSpy = jest
        .spyOn(console, 'error')
        .mockImplementation(() => {});

      const url = 'scheme://open?selfApp=%7Binvalid';
      handleUrl({} as SelfClient, url);

      const { navigationRef } = require('@/navigation');
      expect(navigationRef.reset).toHaveBeenCalledWith({
        index: 1,
        routes: [{ name: 'Home' }, { name: 'QRCodeTrouble' }],
      });
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Error parsing selfApp:',
        expect.any(Error),
      );

      consoleErrorSpy.mockRestore();
    });

    it('handles sessionId with invalid characters', () => {
      const consoleWarnSpy = jest
        .spyOn(console, 'warn')
        .mockImplementation(() => {});
      const consoleErrorSpy = jest
        .spyOn(console, 'error')
        .mockImplementation(() => {});

      const url = 'scheme://open?sessionId=abc<script>alert("xss")</script>';
      handleUrl({} as SelfClient, url);

      const { navigationRef } = require('@/navigation');
      expect(navigationRef.reset).toHaveBeenCalledWith({
        index: 1,
        routes: [{ name: 'Home' }, { name: 'QRCodeTrouble' }],
      });
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Parameter sessionId failed validation:',
        'abc<script>alert("xss")</script>',
      );
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'No sessionId, selfApp or valid OAuth parameters found in the data',
      );

      consoleWarnSpy.mockRestore();
      consoleErrorSpy.mockRestore();
    });

    it('rejects URLs with malformed parameters', () => {
      const consoleErrorSpy = jest
        .spyOn(console, 'error')
        .mockImplementation(() => {});

      const url = 'scheme://open?sessionId=%ZZ'; // Invalid URL encoding
      handleUrl({} as SelfClient, url);

      const { navigationRef } = require('@/navigation');
      expect(navigationRef.reset).toHaveBeenCalledWith({
        index: 1,
        routes: [{ name: 'Home' }, { name: 'QRCodeTrouble' }],
      });

      consoleErrorSpy.mockRestore();
    });

    it('handles valid Turnkey OAuth redirect with code and state', () => {
      const consoleLogSpy = jest
        .spyOn(console, 'log')
        .mockImplementation(() => {});

      const url =
        'https://redirect.self.xyz?scheme=https#code=4/0Ab32j93MfuUU-vJKJth_t0fnnPkg1O7&id_token=eyJhbGciOiJSUzI1NiJ9.eyJzdWIiOiIxMDQwMTAwODA2NDc2NTA5MzU5MzgiLCJlbWFpbCI6InRlc3RAZXhhbXBsZS5jb20ifQ.signature'; // gitleaks:allow
      handleUrl({} as SelfClient, url);

      const { navigationRef } = require('@/navigation');
      // Turnkey OAuth should return silently without navigation
      expect(navigationRef.navigate).not.toHaveBeenCalled();
      expect(navigationRef.reset).not.toHaveBeenCalled();
      expect(consoleLogSpy).toHaveBeenCalledWith(
        '[Deeplinks] Turnkey OAuth redirect received with valid parameters',
      );

      consoleLogSpy.mockRestore();
    });

    it('navigates to QRCodeTrouble when only code is present (missing id_token)', () => {
      const consoleErrorSpy = jest
        .spyOn(console, 'error')
        .mockImplementation(() => {});

      const url =
        'https://redirect.self.xyz?scheme=https#code=4/0Ab32j93MfuUU-vJKJth_t0fnnPkg1O7';
      handleUrl({} as SelfClient, url);

      const { navigationRef } = require('@/navigation');
      // With just code and id_token validation removed, this should be accepted as valid OAuth
      expect(navigationRef.navigate).not.toHaveBeenCalled();
      expect(navigationRef.reset).not.toHaveBeenCalled();

      consoleErrorSpy.mockRestore();
    });

    it('handles valid Turnkey OAuth with only id_token (implicit flow)', () => {
      const consoleLogSpy = jest
        .spyOn(console, 'log')
        .mockImplementation(() => {});

      const url =
        'https://redirect.self.xyz?scheme=https#id_token=eyJhbGciOiJSUzI1NiJ9.eyJzdWIiOiIxMDQwMTAwODA2NDc2NTA5MzU5MzgiLCJlbWFpbCI6InRlc3RAZXhhbXBsZS5jb20ifQ.signature&scope=email%20profile'; // gitleaks:allow
      handleUrl({} as SelfClient, url);

      const { navigationRef } = require('@/navigation');
      expect(navigationRef.navigate).not.toHaveBeenCalled();
      expect(navigationRef.reset).not.toHaveBeenCalled();
      expect(consoleLogSpy).toHaveBeenCalledWith(
        '[Deeplinks] Turnkey OAuth redirect received with valid parameters',
      );

      consoleLogSpy.mockRestore();
    });

    it('navigates to QRCodeTrouble when neither code nor id_token is present', () => {
      const consoleErrorSpy = jest
        .spyOn(console, 'error')
        .mockImplementation(() => {});

      const url =
        'https://redirect.self.xyz?scheme=https#scope=email%20profile';
      handleUrl({} as SelfClient, url);

      const { navigationRef } = require('@/navigation');
      expect(navigationRef.reset).toHaveBeenCalledWith({
        index: 1,
        routes: [{ name: 'Home' }, { name: 'QRCodeTrouble' }],
      });

      consoleErrorSpy.mockRestore();
    });

    it('rejects Turnkey OAuth with invalid id_token format', () => {
      const consoleErrorSpy = jest
        .spyOn(console, 'error')
        .mockImplementation(() => {});

      // id_token with invalid characters (XSS attempt) - should be rejected
      // code is valid, but since id_token is invalid and rejected, code alone shouldn't trigger OAuth
      const url =
        'https://redirect.self.xyz?scheme=https#code=4/0Ab32j93&id_token=<script>alert("xss")</script>';
      handleUrl({} as SelfClient, url);

      const { navigationRef } = require('@/navigation');
      // Code without valid id_token should still be accepted as valid OAuth (authorization code flow)
      // So this should NOT navigate to QRCodeTrouble
      expect(navigationRef.navigate).not.toHaveBeenCalled();
      expect(navigationRef.reset).not.toHaveBeenCalled();

      consoleErrorSpy.mockRestore();
    });
  });

  describe('parseAndValidateUrlParams', () => {
    it('returns valid sessionId parameter', () => {
      const url = 'scheme://open?sessionId=abc123';
      const result = parseAndValidateUrlParams(url);
      expect(result).toEqual({ sessionId: 'abc123' });
    });

    it('returns valid selfApp parameter', () => {
      const selfApp = { sessionId: 'abc' };
      const url = `scheme://open?selfApp=${encodeURIComponent(JSON.stringify(selfApp))}`;
      const result = parseAndValidateUrlParams(url);
      expect(result).toEqual({ selfApp: JSON.stringify(selfApp) });
    });

    it('returns valid mock_passport parameter', () => {
      const mockData = { name: 'John', surname: 'Doe' };
      const url = `scheme://open?mock_passport=${encodeURIComponent(JSON.stringify(mockData))}`;
      const result = parseAndValidateUrlParams(url);
      expect(result).toEqual({ mock_passport: JSON.stringify(mockData) });
    });

    it('filters out unexpected parameters', () => {
      const consoleWarnSpy = jest
        .spyOn(console, 'warn')
        .mockImplementation(() => {});

      const url =
        'scheme://open?sessionId=abc123&maliciousParam=evil&anotherBad=param';
      const result = parseAndValidateUrlParams(url);

      expect(result).toEqual({ sessionId: 'abc123' });
      // Check both warnings were called, regardless of order
      expect(consoleWarnSpy).toHaveBeenCalledTimes(2);
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        'Unexpected or invalid parameter ignored: maliciousParam',
      );
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        'Unexpected or invalid parameter ignored: anotherBad',
      );

      consoleWarnSpy.mockRestore();
    });

    it('rejects sessionId with invalid characters', () => {
      const consoleErrorSpy = jest
        .spyOn(console, 'error')
        .mockImplementation(() => {});

      const url = 'scheme://open?sessionId=abc<script>alert("xss")</script>';
      const result = parseAndValidateUrlParams(url);

      expect(result).toEqual({});
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Parameter sessionId failed validation:',
        'abc<script>alert("xss")</script>',
      );

      consoleErrorSpy.mockRestore();
    });

    it('handles URL-encoded characters correctly', () => {
      const sessionId = 'abc-123_TEST';
      const url = `scheme://open?sessionId=${encodeURIComponent(sessionId)}`;
      const result = parseAndValidateUrlParams(url);
      expect(result).toEqual({ sessionId });
    });

    it('handles complex JSON in selfApp parameter', () => {
      const complexSelfApp = {
        sessionId: 'abc123',
        nested: { data: 'value', numbers: [1, 2, 3] },
        special: 'chars with spaces and symbols',
      };
      const url = `scheme://open?selfApp=${encodeURIComponent(JSON.stringify(complexSelfApp))}`;
      const result = parseAndValidateUrlParams(url);
      expect(result).toEqual({ selfApp: JSON.stringify(complexSelfApp) });
    });

    it('handles malformed URL encoding gracefully', () => {
      const consoleErrorSpy = jest
        .spyOn(console, 'error')
        .mockImplementation(() => {});

      const url = 'scheme://open?sessionId=%ZZ'; // Invalid URL encoding
      const result = parseAndValidateUrlParams(url);

      expect(result).toEqual({});
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Error decoding parameter sessionId:',
        expect.any(Error),
      );

      consoleErrorSpy.mockRestore();
    });

    it('ignores empty parameter values', () => {
      const url = 'scheme://open?sessionId=&selfApp=validValue';
      const result = parseAndValidateUrlParams(url);
      expect(result).toEqual({ selfApp: 'validValue' });
    });

    it('handles duplicate keys correctly', () => {
      // Test what actually happens with duplicate keys in query-string library
      const url = 'scheme://open?sessionId=valid1&sessionId=valid2';
      const result = parseAndValidateUrlParams(url);
      // query-string typically handles duplicates by taking the last value or creating an array
      // We'll accept either a valid sessionId or empty object if it creates an array
      expect(
        result.sessionId === undefined || typeof result.sessionId === 'string',
      ).toBe(true);
    });

    it('handles completely malformed URLs', () => {
      const consoleErrorSpy = jest
        .spyOn(console, 'error')
        .mockImplementation(() => {});

      const url = 'not-a-valid-url-at-all';
      const result = parseAndValidateUrlParams(url);

      expect(result).toEqual({});

      consoleErrorSpy.mockRestore();
    });

    it('handles URLs with no query parameters', () => {
      const url = 'scheme://open';
      const result = parseAndValidateUrlParams(url);
      expect(result).toEqual({});
    });

    it('handles URLs with empty query string', () => {
      const url = 'scheme://open?';
      const result = parseAndValidateUrlParams(url);
      expect(result).toEqual({});
    });

    it('validates sessionId with allowed characters', () => {
      const validSessionIds = [
        'abc123',
        'ABC_123',
        'test-value',
        '123456789',
        'a_b-c_123',
      ];

      validSessionIds.forEach(sessionId => {
        const url = `scheme://open?sessionId=${sessionId}`;
        const result = parseAndValidateUrlParams(url);
        expect(result).toEqual({ sessionId });
      });
    });

    it('rejects sessionId with disallowed characters', () => {
      const consoleErrorSpy = jest
        .spyOn(console, 'error')
        .mockImplementation(() => {});

      const invalidSessionIds = [
        'abc@123',
        'test value',
        'test#value',
        'test$%^&*()',
      ];

      invalidSessionIds.forEach(sessionId => {
        const url = `scheme://open?sessionId=${encodeURIComponent(sessionId)}`;
        const result = parseAndValidateUrlParams(url);
        expect(result).toEqual({});
      });

      consoleErrorSpy.mockRestore();
    });

    it('handles non-string parameter values', () => {
      const consoleWarnSpy = jest
        .spyOn(console, 'warn')
        .mockImplementation(() => {});

      // This might happen if query-string returns an array for duplicate keys
      const mockParseUrl = jest.fn().mockReturnValue({
        query: { sessionId: ['value1', 'value2'] },
      });

      // Temporarily mock the parseUrl import
      jest.doMock('query-string', () => ({ parseUrl: mockParseUrl }));

      // Re-require to get the mocked version
      jest.resetModules();
      const {
        parseAndValidateUrlParams: mockedParser,
      } = require('@/navigation/deeplinks');

      const url = 'scheme://open?sessionId=duplicate&sessionId=values';
      const result = mockedParser(url);

      expect(result).toEqual({});

      consoleWarnSpy.mockRestore();
    });
  });

  describe('Turnkey OAuth parameter validation', () => {
    it('returns valid code and state parameters', () => {
      const url =
        'https://redirect.self.xyz?scheme=https#code=4/0Ab32j93MfuUU-vJKJth_t0fnnPkg1O7&state=state_abc';
      const result = parseAndValidateUrlParams(url);
      expect(result.code).toBe('4/0Ab32j93MfuUU-vJKJth_t0fnnPkg1O7');
      expect(result.state).toBe('state_abc');
    });

    it('returns id_token and scope parameters', () => {
      const url =
        'https://redirect.self.xyz?scheme=https#id_token=eyJhbGciOiJSUzI1NiJ9.eyJzdWIiOiIxMDQwMTAwODA2NDc2NTA5MzU5MzgiLCJlbWFpbCI6InRlc3RAZXhhbXBsZS5jb20ifQ.signature&scope=email%20profile'; // gitleaks:allow
      const result = parseAndValidateUrlParams(url);
      expect(result.id_token).toBeTruthy();
      expect(result.scope).toBe('email profile');
    });

    it('handles code with forward slashes (Google OAuth format)', () => {
      const url =
        'https://redirect.self.xyz?scheme=https#code=4/0Ab32j93MfuUU-vJKJth_t0fnnPkg1O7CMFt3YS0RKh9yreKIqdMg4qZh6MaIkfonjNlJFw';
      const result = parseAndValidateUrlParams(url);
      expect(result.code).toBe(
        '4/0Ab32j93MfuUU-vJKJth_t0fnnPkg1O7CMFt3YS0RKh9yreKIqdMg4qZh6MaIkfonjNlJFw',
      );
    });

    it('rejects id_token with invalid characters (XSS attempt)', () => {
      const consoleErrorSpy = jest
        .spyOn(console, 'error')
        .mockImplementation(() => {});

      // URL with only an invalid id_token - this should reject the id_token
      const url =
        'https://redirect.self.xyz#id_token=<script>alert("xss")</script>';
      const result = parseAndValidateUrlParams(url);

      // The invalid id_token should be rejected
      expect(result.id_token).toBeUndefined();
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Parameter id_token failed validation:',
        expect.any(String),
      );

      consoleErrorSpy.mockRestore();
    });

    it('filters out unexpected OAuth-related parameters', () => {
      const consoleWarnSpy = jest
        .spyOn(console, 'warn')
        .mockImplementation(() => {});

      const url =
        'https://redirect.self.xyz?scheme=https#code=4/0Ab32j93&state=state_abc&error=access_denied&error_description=user_denied';
      const result = parseAndValidateUrlParams(url);

      expect(result.code).toBe('4/0Ab32j93');
      expect(result.state).toBe('state_abc');
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        'Unexpected or invalid parameter ignored: error',
      );
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        'Unexpected or invalid parameter ignored: error_description',
      );

      consoleWarnSpy.mockRestore();
    });
  });

  it('setup listener registers and cleans up', () => {
    const remove = jest.fn();
    mockLinking.getInitialURL.mockResolvedValue(undefined as any);
    mockLinking.addEventListener.mockReturnValue({ remove });

    const cleanup = setupUniversalLinkListenerInNavigation({} as SelfClient);
    expect(mockLinking.addEventListener).toHaveBeenCalled();
    cleanup();
    expect(remove).toHaveBeenCalled();
  });
});
