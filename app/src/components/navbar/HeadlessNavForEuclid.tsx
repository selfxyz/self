// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import { SystemBars } from 'react-native-edge-to-edge';
import type { NativeStackHeaderProps } from '@react-navigation/native-stack';

export const HeadlessNavForEuclid = (props: NativeStackHeaderProps) => {
  return (
    <>
      <SystemBars
        style={props.options.statusBarStyle}
        hidden={props.options.statusBarHidden}
      />
    </>
  );
};
