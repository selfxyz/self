import React, { useCallback, useEffect, useRef } from 'react';
import { NativeSyntheticEvent, requireNativeComponent } from 'react-native';

interface RCTCameraViewProps {
  ref: ReturnType<typeof useRef>;
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
  onPassportRead: (event: NativeSyntheticEvent<{ data: string }>) => void;
}

const RCT_COMPONENT_NAME = 'CameraViewManager';
const CameraViewManager: React.ComponentType<RCTCameraViewProps> =
  requireNativeComponent(RCT_COMPONENT_NAME);

import { PixelRatio, UIManager, findNodeHandle } from 'react-native';
import { extractMRZInfo } from '../utils/utils';

export interface CameraViewProps {
  isMounted: boolean;
  onPassportRead: (
    error: Error | null,
    mrzData?: ReturnType<typeof extractMRZInfo>,
  ) => void;
}

function createFragment(viewId: number) {
  try {
    UIManager.dispatchViewManagerCommand(
      viewId,
      // we are calling the 'create' command
      UIManager.getViewManagerConfig(
        RCT_COMPONENT_NAME,
      ).Commands.create.toString(),
      [viewId],
    );
  } catch (e) {
    // Error creatingthe fragment
    // TODO: assert this only happens in dev mode when the fragment is already mounted
    console.log(e);
    destroyFragment(viewId);
  }
}
function destroyFragment(viewId: number) {
  try {
    UIManager.dispatchViewManagerCommand(
      viewId,
      // we are calling the 'create' command
      UIManager.getViewManagerConfig(
        RCT_COMPONENT_NAME,
      ).Commands.destroy.toString(),
      [viewId],
    );
  } catch (e) {
    // noop, fragment was destroyed earlier either through navigation or else
    console.log(e);
  }
}

export const CameraView: React.FC<CameraViewProps> = ({
  onPassportRead,
  isMounted,
}) => {
  const ref = useRef(null);

  const _onError = useCallback<RCTCameraViewProps['onError']>(
    ({ nativeEvent: { error, errorMessage, stackTrace } }) => {
      if (!isMounted) {
        return;
      }
      const e = new Error(errorMessage);
      e.stack = stackTrace;
      e.cause = error;
      onPassportRead(e);
    },
    [onPassportRead, isMounted],
  );

  const _onPassportRead = useCallback<RCTCameraViewProps['onPassportRead']>(
    ({ nativeEvent: { data } }) => {
      if (!isMounted) {
        return;
      }
      onPassportRead(null, extractMRZInfo(data));
    },
    [onPassportRead, isMounted],
  );

  useEffect(() => {
    const viewId = findNodeHandle(ref.current);
    if (!viewId) {
      return;
    }

    if (isMounted) {
      createFragment(viewId);
    } else {
      destroyFragment(viewId);
    }
  }, [ref, isMounted]);

  return (
    <CameraViewManager
      style={{
        // converts dpi to px, provide desired height
        height: PixelRatio.getPixelSizeForLayoutSize(800),
        // converts dpi to px, provide desired width
        width: PixelRatio.getPixelSizeForLayoutSize(400),
      }}
      onError={_onError}
      onPassportRead={_onPassportRead}
      ref={ref}
    />
  );
};
