// SPDX-License-Identifier: BUSL-1.1; Copyright (c) 2025 Social Connect Labs, Inc.; Licensed under BUSL-1.1 (see LICENSE); Apache-2.0 from 2029-06-11

import { useEffect, useRef } from 'react';
import type { NativeSyntheticEvent, requireNativeComponent } from 'react-native';
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
  onPassportRead?: (event: any) => void;
}

function dispatchCommand(fragmentComponentName: string, viewId: number, command: 'create' | 'destroy') {
  try {
    UIManager.dispatchViewManagerCommand(
      viewId,
      UIManager.getViewManagerConfig(fragmentComponentName).Commands[command].toString(),
      [viewId],
    );
  } catch (e) {
    // Error creating the fragment
    // TODO: assert this only happens in dev mode when the fragment is already mounted
    console.warn(e);
    if (command === 'create') {
      dispatchCommand(fragmentComponentName, viewId, 'destroy');
    }
  }
}

export const RCTFragment = ({
  RCTFragmentViewManager,
  fragmentComponentName,
  isMounted,
  ...props
}: RCTFragmentViewManagerProps) => {
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
