'use client';

import { OpenPassportQRcode } from '../../../../../src/QRcode/OpenPassportQRcode';
// import { OpenPassportQRcode } from '../../../../dist/bundle.web.js'
import { TextField } from '@mui/material';
import { useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { COMMITMENT_TREE_TRACKER_URL } from '../../../../../../common/src/constants/constants';
export default function Prove() {
  const [appName, setAppName] = useState('🌐 OpenPassport');
  const [forbiddenCountriesList, setForbiddenCountriesList] = useState(["BMU", "BLZ", "PAN"]);
  const [olderThan, setOlderThan] = useState("18");
  const userId = uuidv4();
  return (
    <div className="h-screen w-full bg-white flex flex-col items-center justify-center gap-4">
      <div className="text-4xl text-black ">Prove circuit</div>
      <OpenPassportQRcode
        appName={appName}
        scope="test"
        userId={userId}
        olderThan={olderThan}
        circuit="prove"
        circuitMode="prove_offchain"
        ofac="true"
        forbidden_countries_list={forbiddenCountriesList}
        devMode={true}
      />
      <div className='h-12' />
      <TextField
        id="outlined-basic"
        label="App Name"
        variant="outlined"
        value={appName}
        onChange={(e) => { setAppName(e.target.value) }}
      />
      <TextField
        id="outlined-basic"
        label="Older Than"
        variant="outlined"
        value={olderThan}
        onChange={(e) => setOlderThan(e.target.value)}
      />
      <TextField
        id="outlined-basic"
        label="Forbidden Countries List"
        variant="outlined"
        value={forbiddenCountriesList.join(',')}
        onChange={(e) => setForbiddenCountriesList(e.target.value.split(','))}
      />
      <TextField
        id="outlined-basic"
        label="Ofac"
        variant="outlined"
        value={"true"}
      />


    </div>
  );
}
