// SPDX-License-Identifier: BUSL-1.1; Copyright (c) 2025 Social Connect Labs, Inc.; Licensed under BUSL-1.1 (see LICENSE); Apache-2.0 from 2029-06-11

import { Linking } from 'react-native';

jest.mock('../../src/navigation', () => ({
  navigationRef: { navigate: jest.fn(), isReady: jest.fn(() => true) },
}));

const mockSelfAppStore = { useSelfAppStore: { getState: jest.fn() } };
jest.mock('../../src/stores/selfAppStore', () => mockSelfAppStore);

const mockUserStore = { default: { getState: jest.fn() } };
jest.mock('../../src/stores/userStore', () => ({
  __esModule: true,
  ...mockUserStore,
}));

let setSelfApp: jest.Mock, startAppListener: jest.Mock, cleanSelfApp: jest.Mock;
let setDeepLinkUserDetails: jest.Mock;

let handleUrl: (url: string) => void;
let setupUniversalLinkListenerInNavigation: () => () => void;

describe('deeplinks', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetModules();
    ({
      handleUrl,
      setupUniversalLinkListenerInNavigation,
    } = require('../../src/utils/deeplinks'));
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

  it('handles selfApp parameter', () => {
    const selfApp = { sessionId: 'abc' };
    const url = `scheme://open?selfApp=${encodeURIComponent(JSON.stringify(selfApp))}`;
    handleUrl(url);

    expect(setSelfApp).toHaveBeenCalledWith(selfApp);
    expect(startAppListener).toHaveBeenCalledWith('abc');
    const { navigationRef } = require('../../src/navigation');
    expect(navigationRef.navigate).toHaveBeenCalledWith('ProveScreen');
  });

  it('handles sessionId parameter', () => {
    const url = 'scheme://open?sessionId=123';
    handleUrl(url);

    expect(cleanSelfApp).toHaveBeenCalled();
    expect(startAppListener).toHaveBeenCalledWith('123');
    const { navigationRef } = require('../../src/navigation');
    expect(navigationRef.navigate).toHaveBeenCalledWith('ProveScreen');
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
    const { navigationRef } = require('../../src/navigation');
    expect(navigationRef.navigate).toHaveBeenCalledWith('MockDataDeepLink');
  });

  it('navigates to QRCodeTrouble for invalid data', () => {
    const consoleErrorSpy = jest
      .spyOn(console, 'error')
      .mockImplementation(() => {});

    const url = 'scheme://open?selfApp=%7Binvalid';
    handleUrl(url);

    const { navigationRef } = require('../../src/navigation');
    expect(navigationRef.navigate).toHaveBeenCalledWith('QRCodeTrouble');
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      'Error parsing selfApp:',
      expect.any(Error),
    );

    consoleErrorSpy.mockRestore();
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
