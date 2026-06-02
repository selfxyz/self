// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import React from 'react';
import { act, render } from '@testing-library/react-native';

import { SelfVerification, WebViewLoadEvents } from '@selfxyz/rn-sdk';

// Capture the props the SDK passes to the WebView so we can drive its
// onMessage / onError / onHttpError / onRenderProcessGone callbacks directly.
let mockWebViewProps: Record<string, any> | null = null;
jest.mock('react-native-webview', () => {
  const MockWebView = (props: Record<string, any>) => {
    mockWebViewProps = props;
    return null;
  };
  MockWebView.displayName = 'MockWebView';
  return { __esModule: true, default: MockWebView, WebView: MockWebView };
});

function bridgeRequest(version?: unknown) {
  const payload: Record<string, unknown> = {
    type: 'request',
    id: 'req-1',
    domain: 'lifecycle',
    method: 'ready',
    params: {},
    timestamp: 1,
  };
  if (version !== undefined) {
    payload.version = version;
  }
  return { nativeEvent: { data: JSON.stringify(payload) } } as any;
}

function setup(overrides: Record<string, any> = {}) {
  const trackEvent = jest.fn();
  const onLoadDiagnostic = jest.fn();
  const renderError = jest.fn(() => null);
  const renderLoading = jest.fn(() => null);
  const utils = render(
    <SelfVerification
      request={{}}
      onSuccess={jest.fn()}
      onFailure={jest.fn()}
      onCancelled={jest.fn()}
      analytics={{ trackEvent }}
      onLoadDiagnostic={onLoadDiagnostic}
      renderLoading={renderLoading}
      renderError={renderError}
      {...overrides}
    />,
  );
  return { trackEvent, onLoadDiagnostic, renderError, renderLoading, ...utils };
}

describe('SelfVerification load hardening', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    mockWebViewProps = null;
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  it('routes a present-but-wrong protocol version to the terminal mismatch screen (no retry)', () => {
    const { renderError, onLoadDiagnostic, trackEvent } = setup();

    act(() => {
      mockWebViewProps!.onMessage(bridgeRequest(2));
    });

    expect(renderError).toHaveBeenCalledWith(
      expect.objectContaining({ kind: 'version_mismatch', canRetry: false }),
    );
    expect(onLoadDiagnostic).toHaveBeenCalledTimes(1);
    expect(onLoadDiagnostic).toHaveBeenCalledWith(
      expect.objectContaining({
        kind: 'version_mismatch',
        source: 'bundle',
        detail: expect.objectContaining({ received: 2, expected: 1 }),
      }),
    );
    expect(trackEvent).toHaveBeenCalledWith(
      WebViewLoadEvents.VERSION_MISMATCH,
      expect.objectContaining({ source: 'bundle', recoverable: false }),
    );
  });

  it('routes a missing protocol version to the recoverable error screen (retry offered)', () => {
    const { renderError, onLoadDiagnostic, trackEvent } = setup();

    act(() => {
      mockWebViewProps!.onMessage(bridgeRequest(undefined));
    });

    expect(renderError).toHaveBeenCalledWith(
      expect.objectContaining({ kind: 'version_mismatch', canRetry: true }),
    );
    expect(onLoadDiagnostic).toHaveBeenCalledWith(
      expect.objectContaining({
        kind: 'version_mismatch',
        detail: expect.objectContaining({ received: undefined, expected: 1 }),
      }),
    );
    expect(trackEvent).toHaveBeenCalledWith(
      WebViewLoadEvents.VERSION_MISMATCH,
      expect.objectContaining({ recoverable: true }),
    );
  });

  it('fails fast on a hard WebView error without waiting for the load timeout', () => {
    const { renderError, onLoadDiagnostic, trackEvent } = setup();

    act(() => {
      mockWebViewProps!.onError({
        nativeEvent: { code: -2, description: 'net::ERR_FAILED' },
      });
    });

    // No timer advance — the transition is driven by the error event itself.
    expect(renderError).toHaveBeenCalledWith(
      expect.objectContaining({ kind: 'load_error', canRetry: true }),
    );
    expect(onLoadDiagnostic).toHaveBeenCalledWith(
      expect.objectContaining({ kind: 'load_error', source: 'bundle' }),
    );
    expect(trackEvent).toHaveBeenCalledWith(
      WebViewLoadEvents.LOAD_FAILED,
      expect.objectContaining({ kind: 'load_error', source: 'bundle' }),
    );
  });

  it('reports a diagnostic only once even when several errors fire', () => {
    const { onLoadDiagnostic } = setup();

    act(() => {
      mockWebViewProps!.onError({ nativeEvent: { description: 'first' } });
      mockWebViewProps!.onHttpError({ nativeEvent: { statusCode: 500 } });
    });

    expect(onLoadDiagnostic).toHaveBeenCalledTimes(1);
  });

  it('keeps the error UI working when the analytics sink throws (fire-and-forget)', () => {
    const trackEvent = jest.fn(() => {
      throw new Error('analytics down');
    });
    const onLoadDiagnostic = jest.fn();
    const renderError = jest.fn(() => null);

    const utils = render(
      <SelfVerification
        request={{}}
        onSuccess={jest.fn()}
        onFailure={jest.fn()}
        onCancelled={jest.fn()}
        analytics={{ trackEvent }}
        onLoadDiagnostic={onLoadDiagnostic}
        renderError={renderError}
      />,
    );

    expect(() =>
      act(() => {
        mockWebViewProps!.onError({ nativeEvent: { description: 'boom' } });
      }),
    ).not.toThrow();

    expect(renderError).toHaveBeenCalledWith(
      expect.objectContaining({ kind: 'load_error' }),
    );
    expect(onLoadDiagnostic).toHaveBeenCalledTimes(1);
    utils.unmount();
  });

  it('keeps the error UI working when the diagnostic reporter throws', () => {
    const onLoadDiagnostic = jest.fn(() => {
      throw new Error('diagnostics down');
    });
    const renderError = jest.fn(() => null);

    setup({ onLoadDiagnostic, renderError });

    expect(() =>
      act(() => {
        mockWebViewProps!.onError({ nativeEvent: { description: 'boom' } });
      }),
    ).not.toThrow();

    expect(renderError).toHaveBeenCalledWith(
      expect.objectContaining({ kind: 'load_error' }),
    );
    expect(onLoadDiagnostic).toHaveBeenCalledTimes(1);
  });

  it('does not let a later ready message clear a terminal version mismatch', () => {
    const { renderError } = setup();

    act(() => {
      mockWebViewProps!.onMessage(bridgeRequest(2));
    });
    expect(renderError).toHaveBeenCalledTimes(1);

    act(() => {
      mockWebViewProps!.onMessage(bridgeRequest(1));
    });

    expect(renderError).toHaveBeenCalledTimes(1);
    expect(renderError).toHaveBeenLastCalledWith(
      expect.objectContaining({ kind: 'version_mismatch', canRetry: false }),
    );
  });

  it('tracks load recovery when a retry reaches ready', () => {
    const { renderError, trackEvent } = setup();

    act(() => {
      mockWebViewProps!.onError({ nativeEvent: { description: 'first' } });
    });

    const errorInfo =
      renderError.mock.calls[renderError.mock.calls.length - 1][0];
    act(() => {
      errorInfo.onRetry();
    });
    act(() => {
      mockWebViewProps!.onMessage(bridgeRequest(1));
    });

    expect(trackEvent).toHaveBeenCalledWith(
      WebViewLoadEvents.LOAD_RECOVERED,
      expect.objectContaining({ source: 'bundle' }),
    );
  });

  it('keeps late non-crash load errors from regressing a ready WebView', () => {
    const { renderError, onLoadDiagnostic } = setup();

    act(() => {
      mockWebViewProps!.onMessage(bridgeRequest(1));
    });
    act(() => {
      mockWebViewProps!.onError({
        nativeEvent: { code: -2, description: 'late network error' },
      });
    });

    expect(renderError).not.toHaveBeenCalled();
    expect(onLoadDiagnostic).not.toHaveBeenCalled();
  });

  it('surfaces a recoverable error when the renderer dies after ready', () => {
    const { renderError, onLoadDiagnostic, trackEvent } = setup();

    act(() => {
      mockWebViewProps!.onMessage(bridgeRequest(1));
    });
    act(() => {
      mockWebViewProps!.onRenderProcessGone({
        nativeEvent: { didCrash: true },
      });
    });

    expect(renderError).toHaveBeenCalledWith(
      expect.objectContaining({ kind: 'load_error', canRetry: true }),
    );
    expect(onLoadDiagnostic).toHaveBeenCalledWith(
      expect.objectContaining({
        kind: 'load_error',
        detail: expect.objectContaining({
          phase: 'onRenderProcessGone',
          didCrash: true,
        }),
      }),
    );
    expect(trackEvent).toHaveBeenCalledWith(
      WebViewLoadEvents.LOAD_FAILED,
      expect.objectContaining({ kind: 'load_error', source: 'bundle' }),
    );
  });
});
