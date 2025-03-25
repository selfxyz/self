'use client';

import { SelfAppBuilder } from '../../../../../qrcode/SelfQRcode';
import SelfQRcodeWrapper from '../../../../../qrcode/SelfQRcode';
import { countries } from '../../../../../qrcode/SelfQRcode';
import { v4 } from 'uuid';
import {logo} from './logo';

export default function Prove() {
  const userId = v4();
  
  const selfApp = new SelfAppBuilder({
    appName: "Mock App2",
    scope: "test-scope",
    endpoint: "https://8ea8-157-131-196-195.ngrok-free.app/api/v1/verify-vc-and-disclose-proof",
    logoBase64: logo,
    userId,
    disclosures: {
      name: true,
      nationality: true,
      date_of_birth: true,
      passport_number: true,
      minimumAge: 20,
      excludedCountries: [
        countries.UNITED_STATES,
        countries.JAPAN,
        countries.GERMANY,
        countries.FRANCE,
        countries.UNITED_KINGDOM,
        countries.ITALY,
        countries.CANADA,
        countries.AUSTRALIA,
        countries.BRAZIL,
        countries.CHINA,
        countries.INDIA,
        countries.RUSSIA,
        countries.SOUTH_KOREA,
        countries.SPAIN,
        countries.MEXICO,
        countries.NETHERLANDS,
        countries.SWITZERLAND,
        countries.SINGAPORE,
        countries.SWEDEN,
        countries.NEW_ZEALAND
      ],
      ofac: true,
    }
  }).build();

  return (
    <div className="h-screen w-full bg-white flex flex-col items-center justify-center gap-4">
      <SelfQRcodeWrapper
        selfApp={selfApp}
        onSuccess={() => {
          window.location.href = '/success';
        }}
      />
    </div>
  );
}
