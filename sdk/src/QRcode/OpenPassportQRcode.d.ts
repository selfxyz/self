import React from 'react';
import { UserIdType } from '../../../common/src/utils/utils';
import { countryCodes } from '../../../common/src/constants/constants';

type CountryName = typeof countryCodes[keyof typeof countryCodes];

export interface OpenPassportQRcodeProps {
  appName: string;
  scope: string;
  userId: string;
  userIdType?: UserIdType;
  olderThan?: string;
  nationality?: string;
  onSuccess?: (result: any) => void;
  size?: number;
  devMode?: boolean;
  websocketUrl?: string;
  merkleTreeUrl?: string;
}

declare const OpenPassportQRcode: React.FC<OpenPassportQRcodeProps>;

export default OpenPassportQRcode;
