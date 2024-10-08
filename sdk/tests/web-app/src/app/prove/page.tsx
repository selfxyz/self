'use client';

import { OpenPassportQRcode } from '../../../../../src/QRcode/OpenPassportQRcode';
// import { OpenPassportQRcode } from '../../../../dist/bundle.web.js'
import { TextField } from '@mui/material';
import { useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { COMMITMENT_TREE_TRACKER_URL } from '../../../../../../common/src/constants/constants';
export default function Prove() {
  const [appName, setAppName] = useState('🌐 OpenPassport');
  const userId = uuidv4();
  return (
    <div className="h-screen w-full bg-white flex flex-col items-center justify-center gap-12">
      <div className="text-4xl text-black ">Prove circuit</div>
      <OpenPassportQRcode
        appName={appName}
        scope="test"
        userId={userId}
        olderThan="18"
        circuit="prove"
        circuitMode="prove_offchain"
        // nationality="France"
        ofac="true"
        forbidden_countries_list={["BMU", "BLZ", "PAN"]}
        devMode={true}
      />

      <TextField
        id="outlined-basic"
        label="App Name"
        variant="outlined"
        value={appName}
        onChange={(e) => setAppName(e.target.value)}
      />
    </div>
  );
}
