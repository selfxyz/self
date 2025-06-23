//  SPDX-License-Identifier: BUSL-1.1
//  Copyright (c) 2025 Social Connect Labs, Inc.
//
//  This file is licensed under the Business Source License 1.1 (BUSL-1.1).
//
//  Use of this software is governed by the Business Source License included in the LICENSE file.
//
//  As of 2029-06-11, this file will be governed by the Apache License, Version 2.0.

import React from 'react';
import { Platform } from 'react-native';
import { Anchor, styled } from 'tamagui';

const StyledAnchor = styled(Anchor, {
  fontSize: 15,
  fontFamily: 'DINOT-Medium',
  textDecorationLine: 'underline',
});

interface BackupDocumentationLinkProps {}

const BackupDocumentationLink: React.FC<
  BackupDocumentationLinkProps
> = ({}) => {
  if (Platform.OS === 'ios') {
    return (
      <StyledAnchor unstyled href="https://support.apple.com/en-us/102651">
        iCloud data
      </StyledAnchor>
    );
  }
  return (
    <StyledAnchor
      unstyled
      href="https://developer.android.com/identity/data/autobackup"
    >
      Android Backup
    </StyledAnchor>
  );
};

export default BackupDocumentationLink;
