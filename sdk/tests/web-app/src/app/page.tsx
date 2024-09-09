'use client';

import { OpenPassportQRcode } from "../../../../src/QRcode/OpenPassportQRcode";
import { TextField } from "@mui/material";
import { useState } from "react";
import { v4 as uuidv4 } from 'uuid';

export default function Home() {
  const [appName, setAppName] = useState("🌐 OpenPassport");
  const userId = uuidv4();
  return (
    <div className="h-screen w-full bg-white flex flex-col items-center justify-center gap-12">
      <OpenPassportQRcode appName={appName} scope="test" userId={userId} olderThan="18" nationality="France" devMode={true} />

      <TextField id="outlined-basic" label="App Name" variant="outlined" value={appName} onChange={(e) => setAppName(e.target.value)} />
    </div>
  );
}
