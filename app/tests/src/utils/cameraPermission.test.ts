// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import { Alert } from 'react-native';
import { check, openSettings, request } from 'react-native-permissions';

import { ensureCameraForPassportScan } from '@/utils/cameraPermission';

jest.mock('react-native', () => ({
  __esModule: true,
  Alert: { alert: jest.fn() },
  Linking: { openSettings: jest.fn().mockResolvedValue(undefined) },
  Platform: { OS: 'ios', select: (obj: any) => obj.ios },
}));

jest.mock('react-native-permissions', () =>
  require('react-native-permissions/mock'),
);

const alertMock = Alert.alert as jest.MockedFunction<typeof Alert.alert>;
const mockedCheck = check as jest.MockedFunction<typeof check>;
const mockedRequest = request as jest.MockedFunction<typeof request>;
const mockedOpenSettings = openSettings as jest.MockedFunction<
  typeof openSettings
>;

describe('ensureCameraForPassportScan', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns true when permission is already granted', async () => {
    mockedCheck.mockResolvedValueOnce('granted' as never);
    await expect(ensureCameraForPassportScan()).resolves.toBe(true);
    expect(mockedRequest).not.toHaveBeenCalled();
    expect(alertMock).not.toHaveBeenCalled();
  });

  it('returns true when permission is limited', async () => {
    mockedCheck.mockResolvedValueOnce('limited' as never);
    await expect(ensureCameraForPassportScan()).resolves.toBe(true);
    expect(alertMock).not.toHaveBeenCalled();
  });

  it('requests when denied and returns true if granted', async () => {
    mockedCheck.mockResolvedValueOnce('denied' as never);
    mockedRequest.mockResolvedValueOnce('granted' as never);
    await expect(ensureCameraForPassportScan()).resolves.toBe(true);
    expect(mockedRequest).toHaveBeenCalledTimes(1);
    expect(alertMock).not.toHaveBeenCalled();
  });

  it('shows the blocked alert when denied then blocked on request', async () => {
    mockedCheck.mockResolvedValueOnce('denied' as never);
    mockedRequest.mockResolvedValueOnce('blocked' as never);
    await expect(ensureCameraForPassportScan()).resolves.toBe(false);
    expect(alertMock).toHaveBeenCalledTimes(1);
    expect(alertMock.mock.calls[0][0]).toBe('Camera access needed');
  });

  it('shows the blocked alert when the initial check reports blocked', async () => {
    mockedCheck.mockResolvedValueOnce('blocked' as never);
    await expect(ensureCameraForPassportScan()).resolves.toBe(false);
    expect(mockedRequest).not.toHaveBeenCalled();
    expect(alertMock.mock.calls[0][0]).toBe('Camera access needed');
  });

  it('shows the unavailable alert when the device lacks a camera', async () => {
    mockedCheck.mockResolvedValueOnce('unavailable' as never);
    await expect(ensureCameraForPassportScan()).resolves.toBe(false);
    expect(alertMock.mock.calls[0][0]).toBe('Camera not available');
  });

  it('treats thrown check errors as unavailable', async () => {
    mockedCheck.mockRejectedValueOnce(new Error('native crash'));
    await expect(ensureCameraForPassportScan()).resolves.toBe(false);
    expect(alertMock.mock.calls[0][0]).toBe('Camera not available');
  });

  it('invokes openSettings when the user taps Open Settings', async () => {
    mockedCheck.mockResolvedValueOnce('blocked' as never);
    await ensureCameraForPassportScan();
    const buttons = alertMock.mock.calls[0][2] as Array<{
      text: string;
      onPress?: () => void;
    }>;
    const openBtn = buttons.find(b => b.text === 'Open Settings');
    mockedOpenSettings.mockResolvedValueOnce(undefined as never);
    openBtn?.onPress?.();
    expect(mockedOpenSettings).toHaveBeenCalledTimes(1);
  });

  it('adds a "Try Alternative Verification" button when a fallback is supplied (blocked)', async () => {
    mockedCheck.mockResolvedValueOnce('blocked' as never);
    const onFallback = jest.fn();
    await ensureCameraForPassportScan({ onFallback });
    const buttons = alertMock.mock.calls[0][2] as Array<{
      text: string;
      onPress?: () => void;
    }>;
    const fallbackBtn = buttons.find(
      b => b.text === 'Try Alternative Verification',
    );
    fallbackBtn?.onPress?.();
    expect(onFallback).toHaveBeenCalledTimes(1);
  });

  it('adds a fallback button to the unavailable alert', async () => {
    mockedCheck.mockResolvedValueOnce('unavailable' as never);
    const onFallback = jest.fn();
    await ensureCameraForPassportScan({ onFallback });
    const buttons = alertMock.mock.calls[0][2] as Array<{
      text: string;
      onPress?: () => void;
    }>;
    const fallbackBtn = buttons.find(
      b => b.text === 'Try Alternative Verification',
    );
    expect(fallbackBtn).toBeDefined();
    fallbackBtn?.onPress?.();
    expect(onFallback).toHaveBeenCalledTimes(1);
  });
});
