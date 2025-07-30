// SPDX-License-Identifier: BUSL-1.1; Copyright (c) 2025 Social Connect Labs, Inc.; Licensed under BUSL-1.1 (see LICENSE); Apache-2.0 from 2029-06-11

import React, { Suspense } from 'react';
import { View } from 'react-native';

export function lazyScreen<T extends object>(
  importer: () => Promise<{ default: React.ComponentType<T> }>,
): React.ComponentType<T> {
  const LazyComp = React.lazy(importer) as unknown as React.ComponentType<T>;
  const LazyScreenWrapper = (props: T) => (
    <Suspense fallback={<View />}>
      <LazyComp {...(props as T)} />
    </Suspense>
  );
  return LazyScreenWrapper as React.ComponentType<T>;
}
