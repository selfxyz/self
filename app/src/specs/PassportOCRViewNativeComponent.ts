// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import type * as React from 'react';
import {
  codegenNativeComponent,
  type CodegenTypes,
  type ViewProps,
} from 'react-native';

type PassportReadEvent = Readonly<{
  data: string;
}>;

type PassportErrorEvent = Readonly<{
  error: string;
  errorMessage: string;
  stackTrace: string;
}>;

type NativeProps = Readonly<
  ViewProps & {
    isMounted?: boolean;
    onPassportRead?: CodegenTypes.BubblingEventHandler<PassportReadEvent>;
    onError?: CodegenTypes.BubblingEventHandler<PassportErrorEvent>;
  }
>;

type NativeType = React.ComponentType<NativeProps>;

export type PassportOCRViewNativeProps = NativeProps;

export default codegenNativeComponent<NativeProps>(
  'PassportOCRViewManager',
) as NativeType;
