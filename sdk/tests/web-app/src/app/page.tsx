'use client';

import { OpenPassportQRcode } from "../../../../src/QRcode/OpenPassportQRcode";
import { TextField } from "@mui/material";
import { useState } from "react";

export default function Home() {
  const [appName, setAppName] = useState("🌐 OpenPassport");
  return (
    <div className="h-screen w-full bg-white flex flex-col items-center justify-center gap-12">
      <OpenPassportQRcode requirements={[["older_than", "18"], ["nationality", "France"]]} appName={appName} scope="test" userId="test" onSuccess={() => { }} />
      <TextField id="outlined-basic" label="App Name" variant="outlined" value={appName} onChange={(e) => setAppName(e.target.value)} />
    </div>
  );
}
