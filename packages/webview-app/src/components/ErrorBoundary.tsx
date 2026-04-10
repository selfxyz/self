// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import type React from 'react';
import { Component } from 'react';

import { bridgeLifecycleAdapter } from '@selfxyz/webview-bridge/adapters';

import { useBridge } from '../providers/BridgeProvider';

interface ErrorBoundaryProps {
  children: React.ReactNode;
  onDismiss?: () => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundaryInner extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo): void {
    console.error('[ErrorBoundary] Unhandled error:', error, info.componentStack);
  }

  handleRetry = (): void => {
    this.setState({ hasError: false, error: null });
  };

  handleDismiss = (): void => {
    this.props.onDismiss?.();
  };

  render(): React.ReactNode {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <div style={styles.container}>
        <div style={styles.content}>
          <div style={styles.icon}>!</div>
          <h1 style={styles.title}>Something went wrong</h1>
          <p style={styles.message}>An unexpected error occurred. You can try again or close this screen.</p>
          {import.meta.env.DEV && this.state.error && <pre style={styles.errorDetail}>{this.state.error.message}</pre>}
          <button type="button" onClick={this.handleRetry} style={styles.primaryButton}>
            Try again
          </button>
          <button type="button" onClick={this.handleDismiss} style={styles.secondaryButton}>
            Close
          </button>
        </div>
      </div>
    );
  }
}

export const ErrorBoundary: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const bridge = useBridge();

  const handleDismiss = (): void => {
    const lifecycle = bridgeLifecycleAdapter(bridge);
    lifecycle.dismiss({ reason: 'user_cancel' });
  };

  return <ErrorBoundaryInner onDismiss={handleDismiss}>{children}</ErrorBoundaryInner>;
};

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    justifyContent: 'center',
    height: '100vh',
    width: '100%',
    padding: 24,
    backgroundColor: '#fff',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  },
  content: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    maxWidth: 320,
    textAlign: 'center' as const,
  },
  icon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FEE2E2',
    color: '#DC2626',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 24,
    fontWeight: 700,
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: 600,
    color: '#111',
    margin: '0 0 8px',
  },
  message: {
    fontSize: 14,
    color: '#666',
    lineHeight: 1.5,
    margin: '0 0 24px',
  },
  errorDetail: {
    fontSize: 11,
    color: '#999',
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    padding: 12,
    width: '100%',
    overflow: 'auto' as const,
    maxHeight: 80,
    marginBottom: 24,
    textAlign: 'left' as const,
  },
  primaryButton: {
    width: '100%',
    padding: '14px 24px',
    fontSize: 16,
    fontWeight: 600,
    color: '#fff',
    backgroundColor: '#111',
    border: 'none',
    borderRadius: 12,
    cursor: 'pointer',
    marginBottom: 12,
  },
  secondaryButton: {
    width: '100%',
    padding: '14px 24px',
    fontSize: 16,
    fontWeight: 600,
    color: '#666',
    backgroundColor: 'transparent',
    border: '1px solid #ddd',
    borderRadius: 12,
    cursor: 'pointer',
  },
};
