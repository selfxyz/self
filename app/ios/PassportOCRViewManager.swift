// SPDX-License-Identifier: BUSL-1.1; Copyright (c) 2025 Social Connect Labs, Inc.; Licensed under BUSL-1.1 (see LICENSE); Apache-2.0 from 2029-06-11

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
