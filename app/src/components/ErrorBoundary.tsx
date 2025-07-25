// SPDX-License-Identifier: BUSL-1.1; Copyright (c) 2025 Social Connect Labs, Inc.; Licensed under BUSL-1.1 (see LICENSE); Apache-2.0 from 2029-06-11

import React, { Component } from 'react';
import { Text, View } from 'react-native';

import analytics from '../utils/analytics';

const { flush: flushAnalytics } = analytics();

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

  componentDidCatch() {
    // Flush analytics before the app crashes
    flushAnalytics();
    // TODO Sentry React docs recommend Sentry.captureReactException(error, info);
    // https://docs.sentry.io/platforms/javascript/guides/react/features/error-boundary/
    // but ill wait so as to have few changes on native app
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
