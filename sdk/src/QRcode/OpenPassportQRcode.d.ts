import React from 'react';
import { UserIdType } from '../../../common/src/utils/utils';

export interface OpenPassportQRcodeProps {
  appName: string;
  scope: string;
  userId?: string;
  userIdType?: UserIdType;
  olderThan?: string;
  nationality?: string;
  onSuccess?: (result: any) => void;
  circuit?: string;
  size?: number;
  devMode?: boolean;
  websocketUrl?: string;
  merkleTreeUrl?: string;
  attestationId?: string;
}

declare const OpenPassportQRcode: React.FC<OpenPassportQRcodeProps>;

export default OpenPassportQRcode;
