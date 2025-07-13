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
    console.log(
      `[RCTFragment] Dispatching command '${command}' for ${fragmentComponentName}, viewId: ${viewId}`,
    );
    const config = UIManager.getViewManagerConfig(
      fragmentComponentName,
    ) as ViewManagerConfig;

    const commandId = config.Commands[command];
    console.log(`[RCTFragment] Command ID for '${command}': ${commandId}`);
    UIManager.dispatchViewManagerCommand(viewId, commandId, [viewId]);
    console.log(`[RCTFragment] Command '${command}' dispatched successfully`);
  } catch (e) {
    console.error(`[RCTFragment] Error dispatching command '${command}':`, e);
    if (command === 'create') {
      console.log(
        `[RCTFragment] Attempting to destroy fragment after create error`,
      );
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
    console.log(
      `[RCTFragment] useEffect - isMounted: ${isMounted}, viewId: ${viewId}, fragmentComponentName: ${fragmentComponentName}`,
    );

    if (!viewId) {
      console.log(
        `[RCTFragment] No viewId available, skipping command dispatch`,
      );
      return;
    }

    if (isMounted) {
      console.log(`[RCTFragment] Creating fragment`);
      dispatchCommand(fragmentComponentName, viewId, 'create');
    } else {
      console.log(`[RCTFragment] Destroying fragment`);
      dispatchCommand(fragmentComponentName, viewId, 'destroy');
    }
  }, [ref, fragmentComponentName, isMounted]);

  console.log(
    `[RCTFragment] Rendering RCTFragmentViewManager with props:`,
    props,
  );
  return <RCTFragmentViewManager ref={ref} {...props} />;
};
