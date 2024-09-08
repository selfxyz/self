'use client';

import { OpenPassportQRcode } from "../../../../src/QRcode/OpenPassportQRcode";
export default function Home() {
  return (
    <div className="h-screen w-full bg-white flex items-center justify-center">
      <OpenPassportQRcode requirements={[["older_than", "18"], ["nationality", "France"]]} appName="OpenPassport" scope="test" userId="test" onSuccess={() => { }} />
    </div>
  );
}
