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
    <StyledAnchor unstyled href="https://support.apple.com/en-us/102651">
      iCloud data
    </StyledAnchor>;
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
