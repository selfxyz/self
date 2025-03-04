import React, { useEffect, useRef } from 'react';
import {
  findNodeHandle,
  NativeSyntheticEvent,
  requireNativeComponent,
  UIManager,
} from 'react-native';

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
    console.log(e);
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
