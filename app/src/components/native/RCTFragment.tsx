// SPDX-License-Identifier: BUSL-1.1; Copyright (c) 2025 Social Connect Labs, Inc.; Licensed under BUSL-1.1 (see LICENSE); Apache-2.0 from 2029-06-11

import React, { useEffect, useRef } from 'react';
import { NativeSyntheticEvent, requireNativeComponent } from 'react-native';
import { findNodeHandle, UIManager } from 'react-native';

// Type definition for the view manager config structure
interface ViewManagerConfig {
  Commands: {
    [commandName: string]: number;
  };
  [key: string]: any;
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

export interface FragmentProps {
  isMounted: boolean;
}

function dispatchCommand(
  fragmentComponentName: string,
  viewId: number,
  command: 'create' | 'destroy',
) {
  try {
    const config = UIManager.getViewManagerConfig(
      fragmentComponentName,
    ) as ViewManagerConfig;

    const commandId = config.Commands[command];
    UIManager.dispatchViewManagerCommand(viewId, commandId, [viewId]);
  } catch (e) {
    console.error(`[RCTFragment] Error dispatching command '${command}':`, e);
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
