'use client';

import { SelfAppBuilder } from '../../../../../qrcode/OpenPassportQRcode';
import OpenPassportQRcodeWrapper from '../../../../../qrcode/OpenPassportQRcode';
import { v4 } from 'uuid';
import { logo } from './logo';

export default function Prove() {
  const userId = v4();

  const selfApp = new SelfAppBuilder({
    appName: "Mock App2",
    scope: "my-scope",
    endpoint: "https://6885-157-131-196-195.ngrok-free.app/verify",
    logoBase64: logo,
    userId,
    disclosures: {
      excludedCountries: ["ITA"],
    }
  }).build();

  return (
    <div className="h-screen w-full bg-white flex flex-col items-center justify-center gap-4">
      <OpenPassportQRcodeWrapper
        selfApp={selfApp}
        onSuccess={() => {
          window.location.href = '/success';
        }}
      />
    </div>
  );
}
