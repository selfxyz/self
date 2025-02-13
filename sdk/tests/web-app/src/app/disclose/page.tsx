'use client';

import { OpenPassportQRcodeWrapper, SelfApp, SelfAppBuilder } from '../../../../../qrcode/OpenPassportQRcode';
import { v4 as uuidv4 } from 'uuid';
export default function Prove() {
  const userId = uuidv4();



  const selfApp = new SelfAppBuilder('Mock App2', 'scope').minimumAge(18).setUserId(userId).build();
  return (
    <div className="h-screen w-full bg-white flex flex-col items-center justify-center gap-4">
      <OpenPassportQRcodeWrapper
        selfApp={selfApp}
        onSuccess={() => { }}
      />
    </div>
  );
}
