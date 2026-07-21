// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import Foundation

#if canImport(SelfSdkNfc)
import SelfSdkNfc
#endif

// Bridged via @objc to React's RCTPromiseResolveBlock / RCTPromiseRejectBlock in
// SelfPassportReader.m (typealiased here to avoid importing React headers into Swift).
typealias RCTPromiseResolveBlock = (Any?) -> Void
typealias RCTPromiseRejectBlock = (String?, String?, Error?) -> Void

/**
 Native module backing NfcHandler's `scanPassport` path in @selfxyz/rn-sdk.

 Wraps `SelfSdkNfc.NfcPassportHelper`, which reads the passport chip via the
 selfxyz/NFCPassportReader fork (commit b478e1f — identical to app/ios, so there is no
 iOS parity gap). The reader returns the WebView document contract as a JSON string,
 resolved verbatim.

 The consumer app MUST declare the CoreNFC reader entitlement
 (`com.apple.developer.nfc.readersession.formats`) and the `NFCReaderUsageDescription`
 Info.plist key. When `NFCReaderUsageDescription` is missing the scan fails with a clear
 configuration error rather than crashing CoreNFC at session start.

 No passport-derived fields are logged or sent to analytics from this shim.
 */
// Registered only when the SelfSdkNfc framework is actually vendored (fetched by
// scripts/postinstall.js). Without it the class does not exist and the RN module is not
// registered (see SelfPassportReader.m + the SELF_NFC_AVAILABLE podspec macro), so
// NativeModules.SelfPassportReader is absent and the JS capability honestly reports NFC
// unavailable instead of advertising a reader whose every scan rejects.
#if canImport(SelfSdkNfc)
@objc(SelfPassportReader)
class SelfPassportReader: NSObject {

  // Retained across the async scan to prevent ARC deallocation mid-session.
  private var helper: NfcPassportHelper?

  @objc
  static func requiresMainQueueSetup() -> Bool { false }

  @objc(scanPassport:dateOfBirth:dateOfExpiry:canNumber:useCan:skipPACE:skipCA:extendedMode:usePacePolling:sessionId:resolver:rejecter:)
  func scanPassport(
    passportNumber: NSString,
    dateOfBirth: NSString,
    dateOfExpiry: NSString,
    canNumber: NSString,
    useCan: Bool,
    skipPACE: Bool,
    skipCA: Bool,
    extendedMode: Bool,
    usePacePolling: Bool,
    sessionId: NSString,
    resolver: @escaping RCTPromiseResolveBlock,
    rejecter: @escaping RCTPromiseRejectBlock
  ) {
    #if canImport(SelfSdkNfc)
    guard Self.hasNfcUsageDescription() else {
      rejecter(
        "NFC_NOT_CONFIGURED",
        "Missing NFCReaderUsageDescription in the app's Info.plist. Add the CoreNFC reader "
          + "entitlement and NFCReaderUsageDescription to enable passport scanning.",
        nil as Error?
      )
      return
    }
    guard NfcPassportHelper.isNfcAvailable() else {
      rejecter(
        "NFC_NOT_AVAILABLE",
        "NFC reading is unavailable — the device lacks NFC or the CoreNFC reader entitlement "
          + "is not provisioned for this app.",
        nil as Error?
      )
      return
    }
    guard helper == nil else {
      rejecter("ALREADY_SCANNING", "An NFC scan is already in progress", nil as Error?)
      return
    }

    // Advanced BAC/PACE toggles (canNumber, useCan, skipPACE, skipCA, extendedMode,
    // usePacePolling) are accepted for signature compatibility with NfcHandler; the fork's
    // helper negotiates PACE→BAC automatically and does not yet expose them.
    let scanHelper = NfcPassportHelper()
    helper = scanHelper

    DispatchQueue.main.async {
      scanHelper.scanPassport(
        passportNumber: passportNumber as String,
        dateOfBirth: dateOfBirth as String,
        dateOfExpiry: dateOfExpiry as String,
        progress: { _, _, _ in /* state index only; no PII to forward */ },
        completion: { [weak self] success, result in
          DispatchQueue.main.async {
            self?.helper = nil
            if success {
              resolver(result)
            } else {
              rejecter("NFC_SCAN_FAILED", result, nil as Error?)
            }
          }
        }
      )
    }
    #else
    rejecter(
      "NOT_AVAILABLE",
      "SelfSdkNfc is not linked — the NFC reader binary framework was not installed.",
      nil as Error?
    )
    #endif
  }

  // Stopgap cancel. NfcPassportHelper exposes no cancel API, and its scanPassport Task strongly
  // retains the helper, so nil-ing `helper` here would NOT end the CoreNFC session — it would only
  // clear the ALREADY_SCANNING guard and let a conflicting second scan start while the first
  // session is still live. So we leave `helper` set (the scan's own completion handler clears it)
  // and just resolve: the guard stays honest, at the cost of the CoreNFC sheet lingering until the
  // read finishes or times out.
  // TODO(self-sdk-native): call helper?.cancelScan() once the fork exposes PassportReader.stopReading().
  @objc(cancelScan:rejecter:)
  func cancelScan(
    resolver: @escaping RCTPromiseResolveBlock,
    rejecter: @escaping RCTPromiseRejectBlock
  ) {
    resolver(nil)
  }

  #if canImport(SelfSdkNfc)
  private static func hasNfcUsageDescription() -> Bool {
    let description =
      Bundle.main.object(forInfoDictionaryKey: "NFCReaderUsageDescription") as? String
    return !(description?.isEmpty ?? true)
  }
  #endif
}
#endif
