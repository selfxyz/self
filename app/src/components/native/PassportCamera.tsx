import React, { useCallback } from 'react';
import {
  NativeSyntheticEvent,
  PixelRatio,
  Platform,
  requireNativeComponent,
} from 'react-native';

import { extractMRZInfo } from '../../utils/utils';
import { RCTFragment, RCTFragmentViewManagerProps } from './RCTFragment';

interface RCTPassportOCRViewManagerProps extends RCTFragmentViewManagerProps {
  onPassportRead: (
    event: NativeSyntheticEvent<{
      data:
        | string
        | {
            documentNumber: string;
            expiryDate: string;
            birthDate: string;
          };
    }>,
  ) => void;
}

const RCTPassportOCRViewNativeComponent = Platform.select({
  ios: requireNativeComponent('PassportOCRView'),
  android: requireNativeComponent('PassportOCRViewManager'),
});

if (!RCTPassportOCRViewNativeComponent) {
  throw new Error('PassportOCRViewManager not registered for this platform');
}

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
  const _onError = useCallback(
    (
      event: NativeSyntheticEvent<{
        error: string;
        errorMessage: string;
        stackTrace: string;
      }>,
    ) => {
      if (!isMounted) {
        return;
      }
      /* eslint-disable @typescript-eslint/no-unused-vars */
      const { error, errorMessage, stackTrace } = event.nativeEvent;
      const e = new Error(errorMessage);
      e.stack = stackTrace;
      onPassportRead(e);
    },
    [onPassportRead, isMounted],
  );

  const _onPassportRead = useCallback(
    (
      event: NativeSyntheticEvent<{
        data:
          | string
          | {
              documentNumber: string;
              expiryDate: string;
              birthDate: string;
            };
      }>,
    ) => {
      if (!isMounted) {
        return;
      }
      if (typeof event.nativeEvent.data === 'string') {
        onPassportRead(null, extractMRZInfo(event.nativeEvent.data));
      } else {
        onPassportRead(null, {
          passportNumber: event.nativeEvent.data.documentNumber,
          dateOfBirth: event.nativeEvent.data.birthDate,
          dateOfExpiry: event.nativeEvent.data.expiryDate,
        });
      }
    },
    [onPassportRead, isMounted],
  );

  if (Platform.OS === 'ios') {
    return (
      <RCTPassportOCRViewNativeComponent
        onPassportRead={_onPassportRead}
        onError={_onError}
        style={{
          width: '110%',
          height: '110%',
        }}
      />
    );
  } else {
    // For Android, wrap the native component inside your RCTFragment to preserve existing functionality.
    const Fragment = RCTFragment as React.FC<RCTPassportOCRViewManagerProps>;
    return (
      <Fragment
        RCTFragmentViewManager={RCTPassportOCRViewNativeComponent}
        fragmentComponentName="PassportOCRViewManager"
        isMounted={isMounted}
        style={{
          height: PixelRatio.getPixelSizeForLayoutSize(800),
          width: PixelRatio.getPixelSizeForLayoutSize(400),
        }}
        onError={_onError}
        onPassportRead={_onPassportRead}
      />
    );
  }
};
