'use client';

import { OpenPassportQRcode } from '../../../../../src/QRcode/OpenPassportQRcode';
import { v4 as uuidv4 } from 'uuid';
import { OpenPassportVerifier } from '../../../../../src/OpenPassportVerifier';
import { COMMITMENT_TREE_TRACKER_URL } from '../../../../../../common/src/constants/constants';
import axios from 'axios';
export default function Prove() {
  const userId = uuidv4();
  const scope = 'scope';

  const openPassportVerifier = new OpenPassportVerifier('register', scope).setCommitmentMerkleTreeUrl(COMMITMENT_TREE_TRACKER_URL);
  return (
    <div className="h-screen w-full bg-white flex flex-col items-center justify-center gap-4">
      <OpenPassportQRcode
        appName="Mock App"
        userId={userId}
        userIdType={'uuid'}
        openPassportVerifier={openPassportVerifier}
        onSuccess={(attestation) => {
          axios.post('https://proofofpassport-merkle-tree.xyz/api/verifier/register', attestation).then((response) => {
            console.log('Registration response:', response);
          }).catch((error) => {
            console.error('Error registering attestation:', error);
          });
        }}
      />
    </div>
  );
}
