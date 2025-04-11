'use client';

import { SelfAppBuilder } from '../../../../qrcode/SelfQRcode';
import SelfQRcodeWrapper from '../../../../qrcode/SelfQRcode';
import { countries } from '../../../../../common/src/constants/countries';
import { v4 } from 'uuid';

export default function Home() {
  const userId = v4();

  const selfApp = new SelfAppBuilder({
    appName: "Self Workshop",
    logoBase64: "https://pluspng.com/img-png/images-owls-png-hd-owl-free-download-png-png-image-485.png",
    verificationConfig: {
      scope: "self-workshop",
      endpoint: "https://1770-133-3-201-47.ngrok-free.app/api/verify",
      userId,
      endpointType: "https",
      userIdType: "uuid",
      devMode: true,
      disclosureConfig: {
        dateOfBirth: true,
        nationality: true,
        excludedCountries: [
            countries.RUSSIA,
            countries.CHINA,
            countries.NORTH_KOREA,
            countries.IRAN
        ],
        minimumAge: 18,
        passportNoOfac: true,
      }
    }
  }).build();

  return (
    <div className="h-screen w-full bg-white flex flex-col items-center justify-center gap-4">
      <SelfQRcodeWrapper
        selfApp={selfApp}
        type='websocket'
        onSuccess={() => {
          window.location.href = '/verified';
        }}
      />
    </div>
  );
}
