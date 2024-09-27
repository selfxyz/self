'use client';

import { OpenPassportQRcode } from '../../../../../src/QRcode/OpenPassportQRcode';
// import { OpenPassportQRcode } from '../../../../dist/bundle.web.js'
import { TextField } from '@mui/material';
import { useState } from 'react';
import { COMMITMENT_TREE_TRACKER_URL } from '../../../../../../common/src/constants/constants';
import { v4 as uuidv4 } from 'uuid';
export default function Register() {
  const [appName, setAppName] = useState('🌐 OpenPassport');
  const userId = uuidv4();
  return (
    <div className="h-screen w-full bg-white flex flex-col items-center justify-center gap-12">
      <div className="text-4xl text-black ">Register circuit</div>
      <OpenPassportQRcode
        appName={appName}
        scope="test"
        devMode={true}
        circuit="prove"
        circuitMode="register"
        merkleTreeUrl={COMMITMENT_TREE_TRACKER_URL}
        userId={userId}
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
