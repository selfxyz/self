// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import type { ErrorInfo } from 'react';
import React, { Component } from 'react';
import { Text, View } from 'react-native';

import { captureException } from '@/config/sentry';
import { flushAllAnalytics, trackNfcEvent } from '@/services/analytics';

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(_: Error): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    trackNfcEvent('error_boundary', {
      message: error.message,
      stack: info.componentStack,
    });
    // Flush all analytics before the app crashes
    flushAllAnalytics();
    captureException(error, {
      componentStack: info.componentStack,
      errorBoundary: true,
    });
  }

  render() {
    if (this.state.hasError) {
      return (
        <View
          style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}
        >
          <Text>Something went wrong. Please restart the app.</Text>
        </View>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
