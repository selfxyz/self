// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import AVFoundation
import Foundation

#if canImport(SelfSdkOcr)
  import SelfSdkOcr
#endif

// Bridged via @objc to React's promise blocks in SelfMRZScannerModule.m.
typealias RCTPromiseResolveBlock = (Any?) -> Void
typealias RCTPromiseRejectBlock = (String?, String?, Error?) -> Void

/**
 RN native module backing `CameraHandler` in `@selfxyz/rn-sdk`. Reuses the maintained Vision MRZ
 engine from `SelfSdkOcr` (`CameraMrzProviderImpl`) rather than vendoring a copy, and adapts its
 JSON result to `{ documentNumber, dateOfBirth, dateOfExpiry, documentType?, countryCode? }`.

 Rejection codes are the ones `CameraHandler` maps: `CAMERA_PERMISSION_DENIED`,
 `CAMERA_INIT_FAILED` (`MRZ_SCAN_CANCELLED` is unreachable in this headless variant — the real
 product drives the preview through the KMP bridge; see README).
 */
@objc(SelfMRZScannerModule)
class SelfMRZScannerModule: NSObject {

  @objc
  static func requiresMainQueueSetup() -> Bool { false }

  #if canImport(SelfSdkOcr)
    private var provider: CameraMrzProviderImpl?
  #endif

  // `options` may carry the web viewfinder `scanRect`, but this headless variant scans without
  // an on-screen preview, so the rect is ignored (documented in the README). The parameter is
  // accepted to keep the JS bridge contract identical across platforms.
  @objc(startScanning:resolver:rejecter:)
  func startScanning(
    options: NSDictionary,
    resolver: @escaping RCTPromiseResolveBlock,
    rejecter: @escaping RCTPromiseRejectBlock
  ) {
    #if canImport(SelfSdkOcr)
      switch AVCaptureDevice.authorizationStatus(for: .video) {
      case .authorized:
        beginScan(resolver: resolver, rejecter: rejecter)
      case .notDetermined:
        AVCaptureDevice.requestAccess(for: .video) { [weak self] granted in
          if granted {
            self?.beginScan(resolver: resolver, rejecter: rejecter)
          } else {
            rejecter("CAMERA_PERMISSION_DENIED", "Camera permission denied", nil)
          }
        }
      default:
        rejecter("CAMERA_PERMISSION_DENIED", "Camera permission denied", nil)
      }
    #else
      rejecter(
        "CAMERA_INIT_FAILED",
        "SelfSdkOcr is not linked; install the MRZ scanner framework",
        nil
      )
    #endif
  }

  // Web-driven cancel (e.g. leaving the viewfinder route). Best-effort: releases the provider.
  // Never rejects.
  @objc(stopScanning:rejecter:)
  func stopScanning(
    resolver: @escaping RCTPromiseResolveBlock,
    rejecter: @escaping RCTPromiseRejectBlock
  ) {
    #if canImport(SelfSdkOcr)
      provider = nil
    #endif
    resolver(nil)
  }

  #if canImport(SelfSdkOcr)
    private func beginScan(
      resolver: @escaping RCTPromiseResolveBlock,
      rejecter: @escaping RCTPromiseRejectBlock
    ) {
      let mrzProvider = CameraMrzProviderImpl()
      provider = mrzProvider

      guard mrzProvider.isAvailable() else {
        provider = nil
        rejecter("CAMERA_INIT_FAILED", "No camera available", nil)
        return
      }

      mrzProvider.scanMrz(
        onMrzDetected: { [weak self] json in
          self?.provider = nil
          // Guard the parse: a malformed/non-JSON payload must reject (not resolve an empty
          // result), so the RN promise settles with an actionable error.
          guard let result = Self.toResult(json) else {
            rejecter(
              "MRZ_SCAN_INVALID_RESULT",
              "MRZ scan returned an unparseable result",
              nil
            )
            return
          }
          resolver(result)
        },
        onProgress: { _ in },
        onError: { [weak self] message in
          self?.provider = nil
          rejecter("CAMERA_INIT_FAILED", message, nil)
        }
      )
    }

    /// Maps the provider's JSON payload (MrzParser.toDictionary) to the CameraHandler contract.
    private static func toResult(_ json: String) -> [String: Any]? {
      guard
        let data = json.data(using: .utf8),
        let obj = try? JSONSerialization.jsonObject(with: data) as? [String: Any]
      else {
        return nil
      }
      var result: [String: Any] = [
        "documentNumber": obj["documentNumber"] as? String ?? "",
        "dateOfBirth": obj["dateOfBirth"] as? String ?? "",
        "dateOfExpiry": obj["dateOfExpiry"] as? String ?? "",
      ]
      if let documentType = obj["documentType"] as? String, !documentType.isEmpty {
        result["documentType"] = documentType
      }
      if let countryCode = obj["countryCode"] as? String, !countryCode.isEmpty {
        result["countryCode"] = countryCode
      }
      return result
    }
  #endif
}
