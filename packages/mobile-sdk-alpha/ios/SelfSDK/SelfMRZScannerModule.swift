// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.


//
//  SelfMRZScannerModule.swift
//  SelfSDK
//

import Foundation
import React
import SwiftUI
import UIKit

@objc(SelfMRZScannerModule)
class SelfMRZScannerModule: NSObject, RCTBridgeModule {
  static func moduleName() -> String! {
    return "SelfMRZScannerModule"
  }

  static func requiresMainQueueSetup() -> Bool {
    return true
  }

  @objc func startScanning(_ resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
      DispatchQueue.main.async {
          guard let windowScene = UIApplication.shared.connectedScenes.first as? UIWindowScene,
                let rootViewController = windowScene.windows.first?.rootViewController else {
              reject("error", "Unable to find root view controller", nil)
              return
          }

          var hostingController: UIHostingController<SelfLiveMRZScannerView>? = nil
          var scannerView = SelfLiveMRZScannerView()

          scannerView.onScanResultAsDict = { resultDict in
              // Format dates to YYMMDD format
              let dateFormatter = DateFormatter()
              dateFormatter.dateFormat = "yyMMdd"

              let birthDate = resultDict["dateOfBirth"] as? String ?? ""
              let expiryDate = resultDict["expiryDate"] as? String ?? ""

              let resultDict: [String: Any] = [
                  "data": [
                      "documentNumber": resultDict["documentNumber"] as? String ?? "",
                      "expiryDate": expiryDate,
                      "birthDate": birthDate,
                      "documentType": resultDict["documentType"] as? String ?? "",
                      "countryCode": resultDict["countryCode"] as? String ?? ""
                  ]
              ]
              resolve(resultDict)

              // Dismiss the hosting controller after scanning
              hostingController?.dismiss(animated: true, completion: nil)
          }

          hostingController = UIHostingController(rootView: scannerView)
          rootViewController.present(hostingController!, animated: true, completion: nil)
      }
  }

  @objc func stopScanning(_ resolve: RCTPromiseResolveBlock, rejecter reject: RCTPromiseRejectBlock) {
    // Logic to stop scanning
    resolve("Scanning stopped")
  }
}
