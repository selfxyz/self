"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import styles from "./page.module.css";
import { ethers } from "ethers";

const RECEIVER_CONTRACT = process.env.NEXT_PUBLIC_RECEIVER_ADDRESS || "";
const BASE_RPC = process.env.NEXT_PUBLIC_BASE_RPC || "https://mainnet.base.org";

// ABI for MultichainDemoApp
const DEMO_APP_ABI = [
  "function getVerificationCount() view returns (uint256)",
  "function getLastVerification() view returns (tuple(address sender, string nationality, string message, uint256 timestamp, uint256 userIdentifier))",
  "function verifications(uint256) view returns (address sender, string nationality, string message, uint256 timestamp, uint256 userIdentifier)",
];

interface Verification {
  sender: string;
  nationality: string;
  message: string;
  timestamp: bigint;
  userIdentifier: bigint;
}

function VerifiedContent() {
  const searchParams = useSearchParams();
  const startTime = searchParams.get("startTime");

  const [bridgingStatus, setBridgingStatus] = useState<
    "pending" | "checking" | "completed" | "failed"
  >("pending");
  const [verificationCount, setVerificationCount] = useState<number>(0);
  const [initialCount, setInitialCount] = useState<number | null>(null);
  const [checkCount, setCheckCount] = useState(0);
  const [lastVerification, setLastVerification] =
    useState<Verification | null>(null);
  const [bridgeTime, setBridgeTime] = useState<number | null>(null);
  const [elapsedTime, setElapsedTime] = useState<number>(0);

  // Update elapsed time every second while checking
  useEffect(() => {
    if (bridgingStatus === "checking" || bridgingStatus === "pending") {
      const interval = setInterval(() => {
        if (startTime) {
          setElapsedTime(Math.floor((Date.now() - Number(startTime)) / 1000));
        }
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [bridgingStatus, startTime]);

  // Check verification count on Base
  useEffect(() => {
    if (!RECEIVER_CONTRACT || bridgingStatus === "completed") return;

    let intervalId: NodeJS.Timeout;
    let attempts = 0;
    const maxAttempts = 60; // Check for ~5 minutes (every 5 seconds)

    const checkVerification = async () => {
      try {
        const provider = new ethers.JsonRpcProvider(BASE_RPC);
        const contract = new ethers.Contract(
          RECEIVER_CONTRACT,
          DEMO_APP_ABI,
          provider
        );

        const count = await contract.getVerificationCount();
        const currentCount = Number(count);
        setVerificationCount(currentCount);

        // Store initial count on first check
        if (initialCount === null) {
          setInitialCount(currentCount);
          setBridgingStatus("checking");
        } else if (currentCount > initialCount) {
          // New verification received!
          setBridgingStatus("completed");
          clearInterval(intervalId);

          // Get the last verification details
          try {
            const lastVer = await contract.getLastVerification();
            setLastVerification({
              sender: lastVer.sender,
              nationality: lastVer.nationality,
              message: lastVer.message,
              timestamp: lastVer.timestamp,
              userIdentifier: lastVer.userIdentifier,
            });

            // Calculate bridge time
            if (startTime) {
              const contractTimestamp = Number(lastVer.timestamp) * 1000;
              const bridgeTimeMs = contractTimestamp - Number(startTime);
              setBridgeTime(Math.round(bridgeTimeMs / 1000));
            }
          } catch (e) {
            console.error("Error fetching last verification:", e);
          }
        } else {
          setBridgingStatus("checking");
        }

        attempts++;
        setCheckCount(attempts);

        if (attempts >= maxAttempts && currentCount === initialCount) {
          setBridgingStatus("failed");
          clearInterval(intervalId);
        }
      } catch (error) {
        console.error("Error checking verification:", error);
        setBridgingStatus("checking");
        attempts++;
        setCheckCount(attempts);

        if (attempts >= maxAttempts) {
          setBridgingStatus("failed");
          clearInterval(intervalId);
        }
      }
    };

    // Initial check
    checkVerification();

    // Set up polling every 5 seconds
    intervalId = setInterval(checkVerification, 5000);

    return () => clearInterval(intervalId);
  }, [bridgingStatus, initialCount, startTime]);

  const getStatusIcon = () => {
    switch (bridgingStatus) {
      case "completed":
        return "✅";
      case "checking":
        return "🔄";
      case "failed":
        return "⚠️";
      default:
        return "⏱️";
    }
  };

  const getStatusText = () => {
    switch (bridgingStatus) {
      case "completed":
        return `Bridge completed! Total verifications: ${verificationCount}`;
      case "checking":
        return `Waiting for bridge... (${elapsedTime}s elapsed, check ${checkCount})`;
      case "failed":
        return "Bridging taking longer than expected. Check manually below.";
      default:
        return "Waiting for LayerZero to bridge data...";
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-green-50 via-blue-50 to-purple-50 overflow-hidden p-4">
      <div className="bg-white rounded-2xl shadow-xl p-6 sm:p-8 max-w-2xl w-full">
        <div className="text-center mb-8">
          <div className="inline-block">
            <h1 className={styles.rotatingTitle}>
              {bridgingStatus === "completed"
                ? "Bridged!"
                : "Verification Sent!"}
            </h1>
            <div className="flex items-center justify-center gap-2 mt-2">
              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-yellow-100 text-yellow-800">
                ✓ Celo
              </span>
              <span className="text-gray-400">→</span>
              <span
                className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                  bridgingStatus === "completed"
                    ? "bg-blue-100 text-blue-800"
                    : "bg-gray-100 text-gray-600"
                }`}
              >
                {bridgingStatus === "completed" ? "✓" : "..."} Base
              </span>
            </div>
          </div>
        </div>

        {/* Bridge Time Display */}
        {bridgeTime !== null && (
          <div className="text-center mb-6 p-4 bg-green-50 border-2 border-green-200 rounded-xl">
            <p className="text-sm text-green-600 mb-1">Bridge Time</p>
            <p className="text-4xl font-bold text-green-700">
              {bridgeTime} seconds
            </p>
            <p className="text-xs text-green-500 mt-1">
              From verification to destination chain
            </p>
          </div>
        )}

        {/* Verification Data Display */}
        {lastVerification && (
          <div className="mb-6 p-4 bg-purple-50 border-2 border-purple-200 rounded-xl">
            <h3 className="text-lg font-semibold text-purple-900 mb-3">
              🌍 Bridged Data
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center p-2 bg-white rounded">
                <span className="text-sm text-gray-600">Nationality:</span>
                <span className="text-lg font-bold text-purple-700">
                  {lastVerification.nationality || "Not disclosed"}
                </span>
              </div>
              <div className="flex justify-between items-center p-2 bg-white rounded">
                <span className="text-sm text-gray-600">Message:</span>
                <span className="text-lg font-bold text-purple-700">
                  {lastVerification.message || "No message"}
                </span>
              </div>
              <div className="flex justify-between items-center p-2 bg-white rounded">
                <span className="text-sm text-gray-600">Timestamp:</span>
                <span className="text-sm text-gray-700">
                  {new Date(
                    Number(lastVerification.timestamp) * 1000
                  ).toLocaleString()}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Cross-chain bridging status */}
        <div
          className={`border-2 rounded-xl p-4 mb-6 ${
            bridgingStatus === "completed"
              ? "bg-green-50 border-green-200"
              : bridgingStatus === "failed"
                ? "bg-yellow-50 border-yellow-200"
                : "bg-blue-50 border-blue-200"
          }`}
        >
          <h2
            className={`text-lg font-semibold mb-3 flex items-center gap-2 ${
              bridgingStatus === "completed"
                ? "text-green-900"
                : bridgingStatus === "failed"
                  ? "text-yellow-900"
                  : "text-blue-900"
            }`}
          >
            🌉 Bridge Status
          </h2>
          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2">
              <span className="text-xl">✅</span>
              <span className="text-green-800">
                Verification submitted on Celo
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xl">{getStatusIcon()}</span>
              <span
                className={
                  bridgingStatus === "completed"
                    ? "text-green-800 font-semibold"
                    : bridgingStatus === "failed"
                      ? "text-yellow-800"
                      : "text-blue-800"
                }
              >
                {getStatusText()}
              </span>
            </div>
            {(bridgingStatus === "pending" ||
              bridgingStatus === "checking") && (
              <div className="flex items-center gap-2">
                <span className="text-xl">⏱️</span>
                <span className="text-blue-700">
                  Polling every 5s (max 5 minutes)
                </span>
              </div>
            )}
          </div>

          <div className="mt-3 pt-3 border-t border-opacity-30 border-gray-400">
            <p className="text-xs text-gray-600">Contract:</p>
            <code className="block text-xs mt-1 p-1 bg-white rounded break-all text-blue-700">
              {RECEIVER_CONTRACT || "Not configured"}
            </code>
            {initialCount !== null && (
              <p className="text-xs text-gray-500 mt-1">
                Started at {initialCount}, now at {verificationCount}
              </p>
            )}
          </div>
        </div>

        {/* Action Links */}
        <div className="space-y-3">
          <h3 className="font-semibold text-gray-800 text-center">
            View on explorers:
          </h3>

          <a
            href="https://celoscan.io"
            target="_blank"
            rel="noopener noreferrer"
            className="block w-full bg-yellow-600 hover:bg-yellow-700 text-white font-medium py-3 px-4 rounded-lg text-center transition-colors"
          >
            View on Celo →
          </a>

          <a
            href="https://layerzeroscan.com"
            target="_blank"
            rel="noopener noreferrer"
            className="block w-full bg-purple-600 hover:bg-purple-700 text-white font-medium py-3 px-4 rounded-lg text-center transition-colors"
          >
            Track on LayerZero Scan →
          </a>

          <a
            href={`https://basescan.org/address/${RECEIVER_CONTRACT}`}
            target="_blank"
            rel="noopener noreferrer"
            className="block w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-lg text-center transition-colors"
          >
            Check on Base →
          </a>
        </div>

        <div className="mt-6 text-center">
          <a
            href="/"
            className="text-sm text-blue-600 hover:text-blue-800 underline"
          >
            ← Back to verification page
          </a>
        </div>
      </div>
    </div>
  );
}

export default function VerifiedPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-screen">
          <p>Loading...</p>
        </div>
      }
    >
      <VerifiedContent />
    </Suspense>
  );
}
