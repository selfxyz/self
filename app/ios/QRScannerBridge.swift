// SPDX-License-Identifier: BSL-1.1
// Copyright (c) 2025 Social Connect Labs, Inc.
//
// This file is licensed under the Business Source License 1.1 (BSL-1.1).
//
// Use of this software is governed by the Business Source License included in the LICENSE file.
//
// As of 2029-06-11, this file will be governed by the Apache License, Version 2.0.


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
