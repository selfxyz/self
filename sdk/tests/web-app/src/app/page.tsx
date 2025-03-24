'use client';

import { SelfAppBuilder } from '../../../../qrcode/SelfQRcode';
import SelfQRcodeWrapper from '../../../../qrcode/SelfQRcode';
import { v4 } from 'uuid';

export default function Home() {
  const userId = v4();

  const selfApp = new SelfAppBuilder({
    appName: "Self Workshop",
    scope: "self-workshop",
    endpoint: "https://b950-194-230-144-192.ngrok-free.app/api/verify",
    logoBase64: "https://pluspng.com/img-png/images-owls-png-hd-owl-free-download-png-png-image-485.png",
    userId,
    disclosures: {
      minimumAge: 20,
      ofac: true,
    }
  }).build();

  return (
    <div className="h-screen w-full bg-white flex flex-col items-center justify-center gap-4">
      <SelfQRcodeWrapper
        selfApp={selfApp}
        type='deeplink'
        onSuccess={() => {
          window.location.href = '/verified';
        }}
      />
    </div>
  );
}
