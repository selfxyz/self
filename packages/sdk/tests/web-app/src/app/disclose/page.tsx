'use client';

import OpenPassportQRcode from '../../../../../qrcode/OpenPassportQRcode';
import { v4 as uuidv4 } from 'uuid';
import { OpenPassportVerifier } from '@openpassport/core';
import { COMMITMENT_TREE_TRACKER_URL } from '../../../../../../common/src/constants/constants';
export default function Prove() {
  const userId = uuidv4();
  const scope = 'scope';

  const openPassportVerifierDisclose = new OpenPassportVerifier('vc_and_disclose', scope)
    .setCommitmentMerkleTreeUrl(COMMITMENT_TREE_TRACKER_URL)
    .excludeCountries('Albania')
    .setMinimumAge(20)
    .enableOFACCheck();
  return (
    <div className="h-screen w-full bg-white flex flex-col items-center justify-center gap-4">
      <OpenPassportQRcode
        appName="Mock App"
        userId={userId}
        userIdType={'uuid'}
        openPassportVerifier={openPassportVerifierDisclose}
        onSuccess={(attestation) => { }}
      />
    </div>
  );
}
