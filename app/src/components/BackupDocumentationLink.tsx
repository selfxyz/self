// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import React from 'react';
import { Platform } from 'react-native';
import { Anchor, styled } from 'tamagui';

import { androidBackupDocsUrl, appleICloudDocsUrl } from '@/consts/links';

const StyledAnchor = styled(Anchor, {
  fontSize: 15,
  fontFamily: 'DINOT-Medium',
  textDecorationLine: 'underline',
});

const BackupDocumentationLink: React.FC = () => {
  if (Platform.OS === 'ios') {
    return (
      <StyledAnchor unstyled href={appleICloudDocsUrl}>
        iCloud data
      </StyledAnchor>
    );
  }
  return (
    <StyledAnchor unstyled href={androidBackupDocsUrl}>
      Android Backup
    </StyledAnchor>
  );
};

export default BackupDocumentationLink;
