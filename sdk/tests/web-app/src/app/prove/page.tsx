'use client';

import OpenPassportQRcode from '../../../../../qrcode/OpenPassportQRcode';
import { v4 as uuidv4 } from 'uuid';
import { OpenPassportVerifier } from '@openpassport/core';
export default function Prove() {
  const userId = uuidv4();
  const scope = 'scope';

  const openPassportVerifier: OpenPassportVerifier = new OpenPassportVerifier('prove_offchain', scope)
    .excludeCountries('Finland', 'Norway')
    .allowMockPassports()
    .setMinimumAge(12);
  return (
    <div className="h-screen w-full bg-white flex flex-col items-center justify-center gap-4">
      <OpenPassportQRcode
        appName="Mock App"
        userId={userId}
        userIdType={'uuid'}
        openPassportVerifier={openPassportVerifier}
        onSuccess={(attestation) => {
          // send the code to the backend server
        }}
      />
    </div>
  );
}
