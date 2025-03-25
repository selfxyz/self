'use client';

import { SelfAppBuilder } from '../../../../../qrcode/SelfQRcode';
import SelfQRcodeWrapper from '../../../../../qrcode/SelfQRcode';
import type { CountryListKeys } from '../../../../../../common/src/constants/constants';
import { v4 } from 'uuid';
import {logo} from './logo';

const excludedCountries: CountryListKeys[] = [
  'RUSSIA',
  'CHINA',
  'NORTH_KOREA',
  'IRAN',
  'VENEZUELA',
  'CUBA',
  'SYRIA',
  'SUDAN',
  'YEMEN',
  'SOMALIA',
  'LIBYA',
  'IRAQ',
  'AFGHANISTAN',
  'BELARUS',
  'MYANMAR',
  'NICARAGUA',
  'ERITREA',
  'BURUNDI',
  'CENTRAL_AFRICAN_REPUBLIC',
  'MALI'
];

export default function Prove() {
  const userId = v4();
  
  const selfApp = new SelfAppBuilder({
    appName: "Mock App2",
    scope: "test-scope",
    endpoint: "https://f069-133-3-201-47.ngrok-free.app/api/v1/verify-vc-and-disclose-proof",
    logoBase64: logo,
    userId,
    disclosures: {
      name: true,
      nationality: true,
      date_of_birth: true,
      passport_number: true,
      minimumAge: 20,
      excludedCountries: excludedCountries,
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
