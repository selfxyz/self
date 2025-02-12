'use client';

import { OpenPassportQRcodeWrapper, SelfApp } from '../../../../../qrcode/OpenPassportQRcode';
import { v4 as uuidv4 } from 'uuid';
import { OpenPassportVerifier } from '@openpassport/core';
import { TREE_TRACKER_URL } from '../../../../../../common/src/constants/constants';
export default function Prove() {
  const userId = uuidv4();

  const selfApp: SelfApp = {
    appName: 'Mock App',
    userId,
    userIdType: 'uuid',
    scope: 'scope',
    logoBase64: '',
    args: {
      disclosureOptions: [],
    },
    sessionId: uuidv4(),
    devMode: true,
  }
  return (
    <div className="h-screen w-full bg-white flex flex-col items-center justify-center gap-4">
      <OpenPassportQRcodeWrapper
        selfApp={selfApp}
        onSuccess={() => { }}
      />
    </div>
  );
}
