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
        "AFG", "ALA", "ALB", "DZA", "ASM", "AND", "AGO", "AIA", "ATA", "ATG", "ARG", "ARM", "ABW", "AUS", "AZE", "BHS",
        "BHR", "BGD", "BRB", "BLR", "BEL", "BMU", "BLZ", "BEN", "BMU", "BTN", "BOL", "BRN", "CPV", "KHM", "CAN", "CHN",
        "EST", "DNK", "VUT", "ZWE", "ZMB", "YEM", "ESH", "USA"
      ],
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
