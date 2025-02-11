import React from 'react';
import { SelfAttestation, SelfVerifier } from '@openpassport/core';
import { UserIdType } from '../../common/src/utils/circuits/uuid';

interface OpenPassportQRcodeProps {
  appName: string;
  userId: string;
  userIdType: UserIdType;
  selfVerifier: SelfVerifier;
  onSuccess: (attestation: SelfAttestation) => void;
  websocketUrl?: string;
  size?: number;
}

declare const OpenPassportQRcode: React.FC<OpenPassportQRcodeProps>;

export { OpenPassportQRcode, OpenPassportQRcodeProps };
