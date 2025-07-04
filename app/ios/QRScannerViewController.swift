// SPDX-License-Identifier: BUSL-1.1; Copyright (c) 2025 Social Connect Labs, Inc.; Licensed under BUSL-1.1 (see LICENSE); Apache-2.0 from 2029-06-11

//
//  QRScannerViewController.swift
//  OpenPassport
//
//  Created by Rémi Colin on 23/07/2024.
//

import Foundation
import UIKit
import SwiftQRScanner

class QRScannerViewController: UIViewController, QRScannerCodeDelegate {
  var completionHandler: ((String) -> Void)?

  override func viewDidLoad() {
    super.viewDidLoad()

    var configuration = QRScannerConfiguration()
    configuration.cameraImage = UIImage(named: "camera")
    configuration.flashOnImage = UIImage(named: "flash-on")
    configuration.galleryImage = UIImage(named: "photos")

    let scanner = QRCodeScannerController(qrScannerConfiguration: configuration)
    scanner.delegate = self

    addChild(scanner)
    view.addSubview(scanner.view)
    scanner.view.frame = view.bounds
    scanner.didMove(toParent: self)
  }

  func qrScanner(_ controller: UIViewController, didScanQRCodeWithResult result: String) {
    completionHandler?(result)
    dismiss(animated: true, completion: nil)
  }

  func qrScanner(_ controller: UIViewController, didFailWithError error: QRCodeError) {
    print("QR Scanner Error: \(error.localizedDescription)")
    dismiss(animated: true, completion: nil)
  }

  func qrScannerDidCancel(_ controller: UIViewController) {
    dismiss(animated: true, completion: nil)
  }
}
