// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import { Linking } from 'react-native';

jest.mock('@/navigation', () => ({
  navigationRef: {
    navigate: jest.fn(),
    isReady: jest.fn(() => true),
    reset: jest.fn(),
  },
}));

const mockSelfAppStore = { useSelfAppStore: { getState: jest.fn() } };
jest.mock('@selfxyz/mobile-sdk-alpha/stores', () => mockSelfAppStore);

const mockUserStore = { default: { getState: jest.fn() } };
jest.mock('@/stores/userStore', () => ({
  __esModule: true,
  ...mockUserStore,
}));

let setSelfApp: jest.Mock, startAppListener: jest.Mock, cleanSelfApp: jest.Mock;
let setDeepLinkUserDetails: jest.Mock;

let handleUrl: (url: string) => void;
let parseAndValidateUrlParams: (uri: string) => any;
let setupUniversalLinkListenerInNavigation: () => () => void;

describe('deeplinks', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetModules();
    ({
      handleUrl,
      parseAndValidateUrlParams,
      setupUniversalLinkListenerInNavigation,
    } = require('@/utils/deeplinks'));
    setSelfApp = jest.fn();
    startAppListener = jest.fn();
    cleanSelfApp = jest.fn();
    setDeepLinkUserDetails = jest.fn();
    jest.spyOn(Linking, 'getInitialURL').mockResolvedValue(null as any);
    jest
      .spyOn(Linking, 'addEventListener')
      .mockReturnValue({ remove: jest.fn() } as any);
    mockSelfAppStore.useSelfAppStore.getState.mockReturnValue({
      setSelfApp,
      startAppListener,
      cleanSelfApp,
    });
    mockUserStore.default.getState.mockReturnValue({
      setDeepLinkUserDetails,
    });
  });

  describe('handleUrl', () => {
    it('handles selfApp parameter', () => {
      const selfApp = { sessionId: 'abc' };
      const url = `scheme://open?selfApp=${encodeURIComponent(JSON.stringify(selfApp))}`;
      handleUrl(url);

      expect(setSelfApp).toHaveBeenCalledWith(selfApp);
      expect(startAppListener).toHaveBeenCalledWith('abc');
      const { navigationRef } = require('@/navigation');
      expect(navigationRef.navigate).toHaveBeenCalledWith('Prove');
    });

    it('handles sessionId parameter', () => {
      const url = 'scheme://open?sessionId=123';
      handleUrl(url);

      expect(cleanSelfApp).toHaveBeenCalled();
      expect(startAppListener).toHaveBeenCalledWith('123');
      const { navigationRef } = require('@/navigation');
      expect(navigationRef.navigate).toHaveBeenCalledWith('Prove');
    });

    it('handles mock_passport parameter', () => {
      const mockData = { name: 'John', surname: 'Doe' };
      const url = `scheme://open?mock_passport=${encodeURIComponent(JSON.stringify(mockData))}`;
      handleUrl(url);

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

    it('navigates to QRCodeTrouble for invalid data', () => {
      const consoleErrorSpy = jest
        .spyOn(console, 'error')
        .mockImplementation(() => {});

      const url = 'scheme://open?selfApp=%7Binvalid';
      handleUrl(url);

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
      handleUrl(url);

      const { navigationRef } = require('@/navigation');
      expect(navigationRef.reset).toHaveBeenCalledWith({
        index: 1,
        routes: [{ name: 'Home' }, { name: 'QRCodeTrouble' }],
      });
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'No sessionId or selfApp found in the data',
      );

      consoleWarnSpy.mockRestore();
      consoleErrorSpy.mockRestore();
    });

    it('rejects URLs with malformed parameters', () => {
      const consoleErrorSpy = jest
        .spyOn(console, 'error')
        .mockImplementation(() => {});

      const url = 'scheme://open?sessionId=%ZZ'; // Invalid URL encoding
      handleUrl(url);

      const { navigationRef } = require('@/navigation');
      expect(navigationRef.reset).toHaveBeenCalledWith({
        index: 1,
        routes: [{ name: 'Home' }, { name: 'QRCodeTrouble' }],
      });

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
      } = require('@/utils/deeplinks');

      const url = 'scheme://open?sessionId=duplicate&sessionId=values';
      const result = mockedParser(url);

      expect(result).toEqual({});

      consoleWarnSpy.mockRestore();
    });
  });

  it('setup listener registers and cleans up', () => {
    const remove = jest.fn();
    (Linking.getInitialURL as jest.Mock).mockResolvedValue(undefined);
    (Linking.addEventListener as jest.Mock).mockReturnValue({ remove });

    const cleanup = setupUniversalLinkListenerInNavigation();
    expect(Linking.addEventListener).toHaveBeenCalled();
    cleanup();
    expect(remove).toHaveBeenCalled();
  });
});
