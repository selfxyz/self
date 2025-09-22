// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import React, { useEffect, useRef } from 'react';
import type {
  NativeSyntheticEvent,
  requireNativeComponent,
} from 'react-native';
import { findNodeHandle, UIManager } from 'react-native';

export interface FragmentProps {
  isMounted: boolean;
}

export interface RCTFragmentViewManagerProps {
  RCTFragmentViewManager: ReturnType<typeof requireNativeComponent>;
  fragmentComponentName: string;
  isMounted: boolean;
  style: {
    width: number;
    height: number;
  };
  onError: (
    event: NativeSyntheticEvent<{
      error: string;
      errorMessage: string;
      stackTrace: string;
    }>,
  ) => void;
}

function dispatchCommand(
  fragmentComponentName: string,
  viewId: number,
  command: 'create' | 'destroy',
) {
  try {
    UIManager.dispatchViewManagerCommand(
      viewId,
      UIManager.getViewManagerConfig(fragmentComponentName).Commands[
        command
      ].toString(),
      [viewId],
    );
  } catch (e) {
    // Error creatingthe fragment
    // TODO: assert this only happens in dev mode when the fragment is already mounted
    console.warn(e);
    if (command === 'create') {
      dispatchCommand(fragmentComponentName, viewId, 'destroy');
    }
  }
}

export const RCTFragment: React.FC<RCTFragmentViewManagerProps> = ({
  RCTFragmentViewManager,
  fragmentComponentName,
  isMounted,
  ...props
}) => {
  const ref = useRef(null);

  useEffect(() => {
    const viewId = findNodeHandle(ref.current);
    if (!viewId) {
      return;
    }

    if (isMounted) {
      dispatchCommand(fragmentComponentName, viewId, 'create');
    } else {
      dispatchCommand(fragmentComponentName, viewId, 'destroy');
    }
  }, [ref, fragmentComponentName, isMounted]);

  return <RCTFragmentViewManager ref={ref} {...props} />;
};
