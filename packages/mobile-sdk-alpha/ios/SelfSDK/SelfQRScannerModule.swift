// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

//
//  SelfQRScannerModule.swift
//  SelfSDK
//

import Foundation
import React
import UIKit
import AVFoundation

@objc(SelfQRScannerModule)
class SelfQRScannerModule: NSObject, RCTBridgeModule {
  static func moduleName() -> String! {
    return "SelfQRScannerModule"
  }

  static func requiresMainQueueSetup() -> Bool {
    return true
  }

  @objc func startScanning(_ resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
      DispatchQueue.main.async {
          guard let rootViewController = UIApplication.shared.keyWindow?.rootViewController else {
              reject("error", "Unable to find root view controller", nil)
              return
          }

          let scannerView = SelfQRScannerView(frame: rootViewController.view.bounds)

          scannerView.onQRData = { resultDict in
              if let dict = resultDict, let data = dict["data"] as? String {
                  resolve(data)
              } else {
                  reject("error", "Invalid QR code data", nil)
              }
          }

          scannerView.onError = { errorDict in
              if let dict = errorDict {
                  let errorMessage = dict["errorMessage"] as? String ?? "QR scanning failed"
                  reject("error", errorMessage, nil)
              } else {
                  reject("error", "QR scanning failed", nil)
              }
          }

          let modalViewController = UIViewController()
          modalViewController.view = scannerView
          modalViewController.modalPresentationStyle = .fullScreen
          rootViewController.present(modalViewController, animated: true, completion: nil)
      }
  }
}


//TODO - check
