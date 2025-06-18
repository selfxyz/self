// SPDX-License-Identifier: BSL-1.1
// Copyright (c) 2025 Social Connect Labs, Inc.
//
// This file is licensed under the Business Source License 1.1 (BSL-1.1).
//
// Use of this software is governed by the Business Source License included in the LICENSE file.
//
// As of 2029-06-11, this file will be governed by the Apache License, Version 2.0.


import Foundation
import React
import SwiftUI
import UIKit

@objc(PassportOCRViewManager)
class PassportOCRViewManager: RCTViewManager {
    override static func requiresMainQueueSetup() -> Bool {
        return true
    }

    override func view() -> UIView! {
        return PassportOCRView()
    }
}

class PassportOCRView: UIView {
    @objc var onPassportRead: RCTDirectEventBlock?
    @objc var onError: RCTDirectEventBlock?

    private var hostingController: UIHostingController<LiveMRZScannerView>?

    override init(frame: CGRect) {
        super.init(frame: frame)
        initializeScanner()
    }

    required init?(coder: NSCoder) {
        super.init(coder: coder)
        initializeScanner()
    }

    private func initializeScanner() {
        let scannerView = LiveMRZScannerView(
            onScanResultAsDict: { [weak self] resultDict in
              self?.onPassportRead?([
                "data": [
                  "documentNumber": resultDict["documentNumber"] as? String ?? "",
                  "expiryDate": resultDict["expiryDate"] as? String ?? "",
                  "birthDate": resultDict["dateOfBirth"] as? String ?? "",
                  "documentType": resultDict["documentType"] as? String ?? "",
                  "countryCode": resultDict["countryCode"] as? String ?? ""
                ]])
            }
        )
        let hostingController = UIHostingController(rootView: scannerView)
        hostingController.view.backgroundColor = .clear
        hostingController.view.translatesAutoresizingMaskIntoConstraints = false
        addSubview(hostingController.view)
        self.hostingController = hostingController
    }

    override func layoutSubviews() {
        super.layoutSubviews()
        hostingController?.view.frame = bounds
    }
}
