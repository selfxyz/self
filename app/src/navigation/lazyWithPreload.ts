// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import { lazy, type LazyExoticComponent } from 'react';

// Helper around React.lazy that exposes the underlying dynamic import
// so callers can manually preload a screen when debugging or profiling.
// Prefer using React.lazy directly and opt into this only when you need
// to eagerly load a component.
export function lazyWithPreload<T extends React.ComponentType<any>>(
  factory: () => Promise<{ default: T }>,
) {
  const Component = lazy(factory) as LazyExoticComponent<T> & {
    preload: () => Promise<{ default: T }>;
  };
  Component.preload = factory;
  return Component;
}
