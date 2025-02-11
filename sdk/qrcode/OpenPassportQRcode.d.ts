import React from 'react';
import { OpenPassportAttestation, OpenPassportVerifier } from '@openpassport/core';
import { UserIdType } from '../../common/src/utils/circuits/uuid';

interface OpenPassportQRcodeProps {
  appName: string;
  userId: string;
  userIdType: UserIdType;
  openPassportVerifier: OpenPassportVerifier;
  onSuccess: (attestation: OpenPassportAttestation) => void;
  websocketUrl?: string;
  size?: number;
}

declare const OpenPassportQRcode: React.FC<OpenPassportQRcodeProps>;

export { OpenPassportQRcode, OpenPassportQRcodeProps };
