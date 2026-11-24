// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import { Modal, Platform } from 'react-native';
import { act, render } from '@testing-library/react-native';

import AlertModal, {
  type AlertModalParams,
  NATIVE_DISMISS_FALLBACK_MS,
} from '@/components/AlertModal';

jest.mock('react-native', () => {
  const React = jest.requireActual('react');
  const MockModal = (props: { visible?: boolean; children?: unknown }) =>
    props.visible
      ? React.createElement(React.Fragment, null, props.children)
      : null;
  return {
    __esModule: true,
    Modal: MockModal,
    Platform: { OS: 'ios' },
    StyleSheet: { create: (styles: unknown) => styles },
  };
});

jest.mock('tamagui', () => {
  const Passthrough = ({ children }: { children?: unknown }) =>
    (children as null) ?? null;
  return {
    styled: () => Passthrough,
    View: Passthrough,
    XStack: Passthrough,
    YStack: Passthrough,
  };
});

jest.mock('@selfxyz/mobile-sdk-alpha/components', () => {
  const Passthrough = ({ children }: { children?: unknown }) =>
    (children as null) ?? null;
  return {
    Title: Passthrough,
    Description: Passthrough,
    PrimaryButton: Passthrough,
    SecondaryButton: Passthrough,
  };
});

jest.mock('@selfxyz/mobile-sdk-alpha/constants/colors', () => ({
  white: '#fff',
}));

jest.mock('@/assets/icons/modal_close.svg', () => () => null);
jest.mock('@/assets/images/logo_inversed.svg', () => () => null);

jest.mock('@/integrations/haptics', () => ({
  confirmTap: jest.fn(),
  impactLight: jest.fn(),
}));

describe('AlertModal onHidden', () => {
  const params = (): AlertModalParams => ({
    titleText: 'Title',
    bodyText: 'Body',
    buttonText: 'OK',
    onButtonPress: jest.fn(),
    onHidden: jest.fn(),
  });

  beforeEach(() => {
    jest.useFakeTimers();
    Platform.OS = 'ios';
  });

  afterEach(() => {
    jest.useRealTimers();
    Platform.OS = 'ios';
  });

  it('fires once when iOS reports the native dismissal', () => {
    const onHidden = jest.fn();
    const modalParams = params();
    const screen = render(
      <AlertModal visible modalParams={modalParams} onHidden={onHidden} />,
    );
    const nativeDismiss = screen.UNSAFE_getByType(Modal).props.onDismiss;

    screen.rerender(
      <AlertModal
        visible={false}
        modalParams={modalParams}
        onHidden={onHidden}
      />,
    );
    expect(onHidden).not.toHaveBeenCalled();
    expect(modalParams.onHidden).not.toHaveBeenCalled();

    act(() => {
      nativeDismiss();
    });
    act(() => {
      jest.advanceTimersByTime(NATIVE_DISMISS_FALLBACK_MS * 2);
    });

    expect(onHidden).toHaveBeenCalledTimes(1);
    expect(modalParams.onHidden).toHaveBeenCalledTimes(1);
  });

  it('falls back to a timer on iOS when the native event never arrives', () => {
    const onHidden = jest.fn();
    const modalParams = params();
    const screen = render(
      <AlertModal visible modalParams={modalParams} onHidden={onHidden} />,
    );

    screen.rerender(
      <AlertModal
        visible={false}
        modalParams={modalParams}
        onHidden={onHidden}
      />,
    );
    act(() => {
      jest.advanceTimersByTime(NATIVE_DISMISS_FALLBACK_MS - 1);
    });
    expect(onHidden).not.toHaveBeenCalled();

    act(() => {
      jest.advanceTimersByTime(1);
    });
    expect(onHidden).toHaveBeenCalledTimes(1);
    expect(modalParams.onHidden).toHaveBeenCalledTimes(1);
  });

  it('fires immediately on Android', () => {
    Platform.OS = 'android';
    const onHidden = jest.fn();
    const modalParams = params();
    const screen = render(
      <AlertModal visible modalParams={modalParams} onHidden={onHidden} />,
    );

    screen.rerender(
      <AlertModal
        visible={false}
        modalParams={modalParams}
        onHidden={onHidden}
      />,
    );

    expect(onHidden).toHaveBeenCalledTimes(1);
    expect(modalParams.onHidden).toHaveBeenCalledTimes(1);
  });

  it('does not fire for a modal that was never visible', () => {
    const onHidden = jest.fn();
    render(
      <AlertModal visible={false} modalParams={params()} onHidden={onHidden} />,
    );
    act(() => {
      jest.advanceTimersByTime(NATIVE_DISMISS_FALLBACK_MS * 2);
    });
    expect(onHidden).not.toHaveBeenCalled();
  });
});
