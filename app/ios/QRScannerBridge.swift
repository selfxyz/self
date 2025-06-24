// SPDX-License-Identifier: BUSL-1.1; Copyright (c) 2025 Social Connect Labs, Inc.; Licensed under BUSL-1.1 (see LICENSE); Apache-2.0 from 2029-06-11

//
//  QRScannerBridge.swift
//  OpenPassport
//
//  Created by Rémi Colin on 23/07/2024.
//

import Foundation
import SwiftQRScanner
import React

@objc(QRScannerBridge)
class QRScannerBridge: NSObject {
  @objc
  static func requiresMainQueueSetup() -> Bool {
    return false
  }

  @objc
  func scanQRCode(_ resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
    DispatchQueue.main.async {
      let rootViewController = UIApplication.shared.keyWindow?.rootViewController
      let qrScannerViewController = QRScannerViewController()
      qrScannerViewController.completionHandler = { result in
        resolve(result)
      }
      rootViewController?.present(qrScannerViewController, animated: true, completion: nil)
    }
  }
}
