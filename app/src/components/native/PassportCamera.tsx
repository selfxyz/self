// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import React, { useCallback } from 'react';
import type { NativeSyntheticEvent, ViewProps } from 'react-native';
import { PixelRatio, Platform, requireNativeComponent } from 'react-native';

import type { SelfClient } from '@selfxyz/mobile-sdk-alpha';
import { useSelfClient } from '@selfxyz/mobile-sdk-alpha';

import PassportOCRViewNativeComponent from '@/specs/PassportOCRViewNativeComponent';

type IOSPassportReadPayload = {
  data:
    | string
    | {
        documentNumber: string;
        expiryDate: string;
        birthDate: string;
        documentType: string;
        countryCode: string;
      };
};

type IOSPassportErrorPayload = {
  error: string;
  errorMessage: string;
  stackTrace: string;
};

type IOSPassportOCRViewProps = ViewProps & {
  isMounted?: boolean;
  onPassportRead?: (
    event: NativeSyntheticEvent<IOSPassportReadPayload>,
  ) => void;
  onError?: (event: NativeSyntheticEvent<IOSPassportErrorPayload>) => void;
};

const IOSPassportOCRViewNativeComponent =
  requireNativeComponent<IOSPassportOCRViewProps>('PassportOCRView');

export interface PassportCameraProps {
  isMounted: boolean;
  onPassportRead: (
    error: Error | null,
    mrzData?: ReturnType<SelfClient['extractMRZInfo']>,
  ) => void;
}

export const PassportCamera: React.FC<PassportCameraProps> = ({
  onPassportRead,
  isMounted,
}) => {
  const selfClient = useSelfClient();
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
      const {
        error: nativeError,
        errorMessage,
        stackTrace,
      } = event.nativeEvent;
      const e = new Error(errorMessage);
      e.name = nativeError;
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
              documentType: string;
              countryCode: string;
            };
      }>,
    ) => {
      if (!isMounted) {
        return;
      }
      if (typeof event.nativeEvent.data === 'string') {
        onPassportRead(null, selfClient.extractMRZInfo(event.nativeEvent.data));
      } else {
        onPassportRead(null, {
          documentNumber: event.nativeEvent.data.documentNumber,
          dateOfBirth: event.nativeEvent.data.birthDate,
          dateOfExpiry: event.nativeEvent.data.expiryDate,
          documentType: event.nativeEvent.data.documentType,
          issuingCountry: event.nativeEvent.data.countryCode,
          validation: {
            format: false, // Changed from true - avoid assuming validation success before actual checks
            passportNumberChecksum: false, // Changed from true - avoid assuming validation success before actual checks
            dateOfBirthChecksum: false, // Changed from true - avoid assuming validation success before actual checks
            dateOfExpiryChecksum: false, // Changed from true - avoid assuming validation success before actual checks
            compositeChecksum: false, // Changed from true - avoid assuming validation success before actual checks
            overall: false, // Changed from true - avoid assuming validation success before actual checks
          },
          // TODO: If raw MRZ lines are accessible from native module, pass them to extractMRZInfo function to perform real checksum validations
        });
      }
    },
    [onPassportRead, isMounted, selfClient],
  );

  if (Platform.OS === 'ios') {
    return (
      <IOSPassportOCRViewNativeComponent
        onPassportRead={_onPassportRead}
        onError={_onError}
        style={{
          width: '130%',
          height: '130%',
        }}
      />
    );
  }

  return (
    <PassportOCRViewNativeComponent
      isMounted={isMounted}
      onPassportRead={_onPassportRead}
      onError={_onError}
      style={{
        height: PixelRatio.getPixelSizeForLayoutSize(800),
        width: PixelRatio.getPixelSizeForLayoutSize(400),
      }}
    />
  );
};
