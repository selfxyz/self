// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import * as mockReact from 'react';
import { Alert } from 'react-native';
import { act, fireEvent, render, screen } from '@testing-library/react-native';

import TroubleshootingScreen from '@/screens/dev/TroubleshootingScreen';

jest.mock('react-native', () => ({
  __esModule: true,
  Alert: { alert: jest.fn() },
  Platform: { OS: 'ios', select: jest.fn(obj => obj.ios || obj.default) },
  StyleSheet: {
    create: (styles: unknown) => styles,
    flatten: (style: unknown) => style,
  },
  View: 'View',
  Text: 'Text',
  TouchableOpacity: 'TouchableOpacity',
}));

jest.mock('tamagui', () => {
  const react = jest.requireActual('react');
  const passthrough =
    (host: string) =>
    ({ children, ...props }: { children?: React.ReactNode }) =>
      react.createElement(host, props, children);
  const Button = ({
    children,
    onPress,
    disabled,
  }: {
    children?: React.ReactNode;
    onPress?: () => void;
    disabled?: boolean;
  }) =>
    react.createElement(
      'TouchableOpacity',
      { testID: 'tamagui-button', onPress, disabled },
      children,
    );
  return {
    __esModule: true,
    Button,
    H4: passthrough('Text'),
    Paragraph: passthrough('Text'),
    Spinner: passthrough('View'),
    Text: passthrough('Text'),
    XStack: passthrough('View'),
    YStack: passthrough('View'),
  };
});

const mockNavigate = jest.fn();
const mockSetParams = jest.fn();
let mockRouteParams: { nfcDebug?: 'pending' | 'run' } | undefined;

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: mockNavigate,
    setParams: mockSetParams,
  }),
  useRoute: () => ({ params: mockRouteParams }),
  // Emulates focus: the effect runs whenever the callback identity changes.
  useFocusEffect: (cb: () => void) => {
    mockReact.useEffect(cb, [cb]);
  },
}));

const mockRun = jest.fn(() => Promise.resolve());
let mockNfcDebug: {
  state: string;
  result: null;
  error: null;
  run: jest.Mock;
  reset: jest.Mock;
  hasMrz: boolean;
  isSupported: boolean;
};

jest.mock('@/hooks/useNfcDebugRun', () => ({
  useNfcDebugRun: () => mockNfcDebug,
}));

const mockEnsureCamera = jest.fn(() => Promise.resolve(true));
jest.mock('@/utils/cameraPermission', () => ({
  ensureCameraForPassportScan: () => mockEnsureCamera(),
}));

jest.mock('@/integrations/nfc/fixtureCapture', () => ({
  isFixtureCaptureSupported: false,
}));
jest.mock('@/providers/authProvider', () => ({
  unsafe_getPrivateKey: jest.fn(),
}));
jest.mock('@/screens/dev/components/TopicToggleButton', () => ({
  TopicToggleButton: () => null,
}));
jest.mock('@/services/points/constants', () => ({
  POINTS_API_BASE_URL: 'https://points.test',
  POINTS_API_ROUTES: { discloseFix: '/fix' },
  POINTS_SELF_APP_ENDPOINT: 'endpoint',
  POINTS_SELF_APP_SCOPE: 'scope',
}));
jest.mock('@/services/points/utils', () => ({
  getPointsAddress: jest.fn(),
}));
jest.mock('@/stores/settingStore', () => ({
  useSettingStore: (selector: (state: unknown) => unknown) =>
    selector({
      fixtureCaptureEnabled: false,
      setFixtureCaptureEnabled: jest.fn(),
    }),
}));
jest.mock('@/utils/nfcDebugOutcome', () => ({
  describeOutcome: () => ({ message: 'ok', tone: 'success' }),
  friendlyRunError: (raw: string) => raw,
}));
jest.mock('poseidon-lite', () => ({ poseidon2: jest.fn() }));
jest.mock('@selfxyz/common/utils/scope', () => ({
  hashEndpointWithScope: jest.fn(),
}));
jest.mock('@selfxyz/mobile-sdk-alpha/constants/colors', () => ({
  amber500: '#f59e0b',
  black: '#000',
  red500: '#ef4444',
  slate200: '#e2e8f0',
  slate500: '#64748b',
  teal500: '#14b8a6',
  white: '#fff',
}));

const pressAlertStart = async () => {
  const alertCall = (Alert.alert as jest.Mock).mock.calls[0];
  const startButton = alertCall[2].find(
    (btn: { text: string }) => btn.text === 'Start',
  );
  await act(async () => {
    await startButton.onPress();
  });
};

const debugButton = () =>
  screen
    .getAllByTestId('tamagui-button')
    .find(el =>
      JSON.stringify(el.props.children).includes('Debug my passport read'),
    );

describe('TroubleshootingScreen NFC-debug section', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRouteParams = undefined;
    mockNfcDebug = {
      state: 'idle',
      result: null,
      error: null,
      run: mockRun,
      reset: jest.fn(),
      hasMrz: false,
      isSupported: true,
    };
  });

  it('keeps the debug button enabled without MRZ data', () => {
    render(<TroubleshootingScreen />);

    expect(debugButton()?.props.disabled).toBe(false);
  });

  it('detours to the camera scan when Start is pressed without MRZ', async () => {
    render(<TroubleshootingScreen />);

    fireEvent.press(debugButton()!);
    await pressAlertStart();

    expect(mockEnsureCamera).toHaveBeenCalled();
    expect(mockSetParams).toHaveBeenCalledWith({ nfcDebug: 'pending' });
    expect(mockNavigate).toHaveBeenCalledWith('DocumentCamera');
    expect(mockRun).not.toHaveBeenCalled();
  });

  it('does not navigate when camera permission is refused', async () => {
    mockEnsureCamera.mockResolvedValueOnce(false);
    render(<TroubleshootingScreen />);

    fireEvent.press(debugButton()!);
    await pressAlertStart();

    expect(mockSetParams).not.toHaveBeenCalled();
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('runs directly when MRZ data already exists', async () => {
    mockNfcDebug.hasMrz = true;
    render(<TroubleshootingScreen />);

    fireEvent.press(debugButton()!);
    await pressAlertStart();

    expect(mockRun).toHaveBeenCalled();
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('consumes the run param and starts without re-prompting', () => {
    mockRouteParams = { nfcDebug: 'run' };
    mockNfcDebug.hasMrz = true;
    render(<TroubleshootingScreen />);

    expect(mockSetParams).toHaveBeenCalledWith({ nfcDebug: undefined });
    expect(mockRun).toHaveBeenCalled();
    expect(Alert.alert).not.toHaveBeenCalled();
  });

  it('clears the run param without starting while busy', () => {
    mockRouteParams = { nfcDebug: 'run' };
    mockNfcDebug.hasMrz = true;
    mockNfcDebug.state = 'waiting';
    render(<TroubleshootingScreen />);

    expect(mockSetParams).toHaveBeenCalledWith({ nfcDebug: undefined });
    expect(mockRun).not.toHaveBeenCalled();
  });
});
