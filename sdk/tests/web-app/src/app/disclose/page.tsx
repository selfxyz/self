'use client';

import { SelfAppBuilder } from '../../../../../qrcode/OpenPassportQRcode';
import OpenPassportQRcodeWrapper from '../../../../../qrcode/OpenPassportQRcode';
import { v4 } from 'uuid';
import {logo} from './logo';

export default function Prove() {
  const userId = v4();
  
  const selfApp = new SelfAppBuilder({
    appName: "Mock App2",
    scope: "test-scope",
    endpoint: "https://mock-app2.com",
    logoBase64: logo,
    userId,
    disclosures: {
      name: true,
      nationality: true,
      date_of_birth: true,
      passport_number: true,
      minimumAge: 18,
      excludedCountries: ["ABC", "DEF"],
      ofac: true,
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
