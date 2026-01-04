"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  SelfQRcodeWrapper,
  SelfAppBuilder,
  type SelfApp,
  getUniversalLink,
} from "@selfxyz/qrcode";

// Contract addresses for cross-chain verification
const DEMO_CONTRACT = process.env.NEXT_PUBLIC_SELF_ENDPOINT || "";
const RECEIVER_CONTRACT = process.env.NEXT_PUBLIC_RECEIVER_ADDRESS || "";

export default function Home() {
  const router = useRouter();
  const [linkCopied, setLinkCopied] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [selfApp, setSelfApp] = useState<SelfApp | null>(null);
  const [universalLink, setUniversalLink] = useState("");
  const [userId] = useState("0x1234567890123456789012345678901234567890");
  const [showInfo, setShowInfo] = useState(false);

  // Initialize SelfApp with multichain configuration
  useEffect(() => {
    try {
      const config = {
        version: 2,
        appName: process.env.NEXT_PUBLIC_SELF_APP_NAME || "Multichain Demo",
        scope: process.env.NEXT_PUBLIC_SELF_SCOPE_SEED || "multichain-demo",
        endpoint: DEMO_CONTRACT,
        logoBase64: "https://i.postimg.cc/mrmVf9hm/self.png",
        userId: userId,
        endpointType: "base" as const, // Celo mainnet → Base mainnet via LayerZero
        userIdType: "hex" as const,
        userDefinedData: "Bridge Test", // Message to bridge
        disclosures: {
          nationality: true, // Request nationality disclosure
        },
      };
      // #region agent log
      fetch('http://127.0.0.1:7243/ingest/c221fb1a-a001-4333-87b7-a57e506cd0d8',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'page.tsx:SelfAppBuilder',message:'Building SelfApp',data:{endpointType:config.endpointType,endpoint:config.endpoint,scope:config.scope,userDefinedData:config.userDefinedData},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'A,E'})}).catch(()=>{});
      // #endregion
      const app = new SelfAppBuilder(config).build();
      // #region agent log
      fetch('http://127.0.0.1:7243/ingest/c221fb1a-a001-4333-87b7-a57e506cd0d8',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'page.tsx:SelfApp:built',message:'SelfApp built successfully',data:{appEndpointType:app.endpointType,appEndpoint:app.endpoint,appSessionId:app.sessionId},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'A,E'})}).catch(()=>{});
      // #endregion

      setSelfApp(app);
      setUniversalLink(getUniversalLink(app));
    } catch (error) {
      console.error("Failed to initialize Self app:", error);
    }
  }, [userId]);

  const displayToast = (message: string) => {
    setToastMessage(message);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
  };

  const copyToClipboard = () => {
    if (!universalLink) return;

    navigator.clipboard
      .writeText(universalLink)
      .then(() => {
        setLinkCopied(true);
        displayToast("Universal link copied to clipboard!");
        setTimeout(() => setLinkCopied(false), 2000);
      })
      .catch((err) => {
        console.error("Failed to copy text: ", err);
        displayToast("Failed to copy link");
      });
  };

  const openSelfApp = () => {
    if (!universalLink) return;
    window.open(universalLink, "_blank");
    displayToast("Opening Self App...");
  };

  const handleSuccessfulVerification = () => {
    // Record the start time for bridge timing
    const startTime = Date.now();
    displayToast("Verification successful! Bridging to Base...");
    setTimeout(() => {
      router.push(`/verified?startTime=${startTime}`);
    }, 1500);
  };

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 flex flex-col items-center justify-center p-4 sm:p-6 md:p-8">
      {/* Header */}
      <div className="mb-6 md:mb-8 text-center max-w-2xl">
        <h1 className="text-2xl sm:text-3xl font-bold mb-2 text-gray-800">
          {process.env.NEXT_PUBLIC_SELF_APP_NAME || "Multichain Demo"}
        </h1>
        <p className="text-sm sm:text-base text-gray-600 px-2 mb-3">
          Verify on Celo, use on Base via LayerZero
        </p>
        <div className="flex items-center justify-center gap-2 text-xs text-gray-500">
          <span className="px-2 py-1 bg-yellow-100 text-yellow-700 rounded">
            Celo ✓
          </span>
          <span>→</span>
          <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded">
            LayerZero
          </span>
          <span>→</span>
          <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded">
            Base
          </span>
        </div>
      </div>

      {/* Main content */}
      <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6 w-full max-w-xs sm:max-w-sm md:max-w-md mx-auto">
        {/* Info Banner */}
        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-start gap-2">
            <span className="text-blue-600 text-xl">ℹ️</span>
            <div className="flex-1">
              <p className="text-xs text-blue-900 font-medium">
                Cross-Chain Verification
              </p>
              <p className="text-xs text-blue-700 mt-1">
                Your nationality will be verified on Celo and bridged to Base
                via LayerZero with &quot;Bridge Test&quot; message.
              </p>
              <button
                onClick={() => setShowInfo(!showInfo)}
                className="text-xs text-blue-600 hover:text-blue-800 mt-1 underline"
              >
                {showInfo ? "Hide" : "Show"} details
              </button>
            </div>
          </div>

          {showInfo && (
            <div className="mt-3 pt-3 border-t border-blue-200 space-y-2">
              <div className="text-xs">
                <span className="font-semibold text-blue-900">
                  dApp Contract (Base):
                </span>
                <code className="block mt-1 p-1 bg-white rounded text-blue-700 break-all">
                  {DEMO_CONTRACT || "Not configured"}
                </code>
              </div>
              <div className="text-xs text-blue-700 mt-2">
                <p className="font-semibold">What gets bridged:</p>
                <ul className="list-disc list-inside space-y-1 mt-1">
                  <li>Your nationality (disclosed)</li>
                  <li>&quot;Bridge Test&quot; message</li>
                  <li>Verification timestamp</li>
                </ul>
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-center mb-4 sm:mb-6">
          {selfApp ? (
            <SelfQRcodeWrapper
              selfApp={selfApp}
              onSuccess={handleSuccessfulVerification}
              onError={() => {
                displayToast("Error: Failed to verify identity");
              }}
            />
          ) : (
            <div className="w-[256px] h-[256px] bg-gray-200 animate-pulse flex items-center justify-center">
              <p className="text-gray-500 text-sm">Loading QR Code...</p>
            </div>
          )}
        </div>

        <div className="flex flex-col sm:flex-row gap-2 sm:space-x-2 mb-4 sm:mb-6">
          <button
            type="button"
            onClick={copyToClipboard}
            disabled={!universalLink}
            className="flex-1 bg-gray-800 hover:bg-gray-700 transition-colors text-white p-2 rounded-md text-sm sm:text-base disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {linkCopied ? "Copied!" : "Copy Universal Link"}
          </button>

          <button
            type="button"
            onClick={openSelfApp}
            disabled={!universalLink}
            className="flex-1 bg-blue-600 hover:bg-blue-500 transition-colors text-white p-2 rounded-md text-sm sm:text-base mt-2 sm:mt-0 disabled:bg-blue-300 disabled:cursor-not-allowed"
          >
            Open Self App
          </button>
        </div>

        {/* Useful Links */}
        <div className="mt-4 pt-4 border-t border-gray-200">
          <p className="text-xs text-gray-600 text-center mb-2">
            Track your verification:
          </p>
          <div className="flex flex-col gap-2">
            <a
              href="https://celoscan.io"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-yellow-600 hover:text-yellow-800 text-center underline"
            >
              Celo Explorer →
            </a>
            <a
              href="https://layerzeroscan.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-purple-600 hover:text-purple-800 text-center underline"
            >
              LayerZero Scan →
            </a>
            <a
              href={`https://basescan.org/address/${RECEIVER_CONTRACT}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-blue-600 hover:text-blue-800 text-center underline"
            >
              Base Explorer →
            </a>
          </div>
        </div>

        {/* Toast notification */}
        {showToast && (
          <div className="fixed bottom-4 right-4 bg-gray-800 text-white py-2 px-4 rounded shadow-lg animate-fade-in text-sm">
            {toastMessage}
          </div>
        )}
      </div>
    </div>
  );
}
