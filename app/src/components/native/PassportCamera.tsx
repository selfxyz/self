import React, { useCallback } from 'react';
import { NativeSyntheticEvent, requireNativeComponent } from 'react-native';
import { PixelRatio } from 'react-native';

import { extractMRZInfo } from '../../utils/utils';
import { RCTFragment, RCTFragmentViewManagerProps } from './RCTFragment';

interface RCTPassportOCRViewManagerProps extends RCTFragmentViewManagerProps {
  onPassportRead: (event: NativeSyntheticEvent<{ data: string }>) => void;
}
const Fragment = RCTFragment as React.FC<RCTPassportOCRViewManagerProps>;
const RCT_COMPONENT_NAME = 'PassportOCRViewManager';
const RCTPassportOCRViewManager: React.ComponentType<RCTPassportOCRViewManagerProps> =
  requireNativeComponent(RCT_COMPONENT_NAME);

export interface PassportCameraProps {
  isMounted: boolean;
  onPassportRead: (
    error: Error | null,
    mrzData?: ReturnType<typeof extractMRZInfo>,
  ) => void;
}

export const PassportCamera: React.FC<PassportCameraProps> = ({
  onPassportRead,
  isMounted,
}) => {
  const _onError = useCallback<RCTPassportOCRViewManagerProps['onError']>(
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

  const _onPassportRead = useCallback<
    RCTPassportOCRViewManagerProps['onPassportRead']
  >(
    ({ nativeEvent: { data } }) => {
      if (!isMounted) {
        return;
      }
      onPassportRead(null, extractMRZInfo(data));
    },
    [onPassportRead, isMounted],
  );

  return (
    <Fragment
      RCTFragmentViewManager={RCTPassportOCRViewManager}
      fragmentComponentName={RCT_COMPONENT_NAME}
      isMounted={isMounted}
      style={{
        // converts dpi to px, provide desired height
        height: PixelRatio.getPixelSizeForLayoutSize(800),
        // converts dpi to px, provide desired width
        width: PixelRatio.getPixelSizeForLayoutSize(400),
      }}
      onError={_onError}
      onPassportRead={_onPassportRead}
    />
  );
};
