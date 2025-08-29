// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.


import Foundation
import React
import SwiftUI
import UIKit

@objc(SelfMRZScannerViewManager)
class SelfMRZScannerViewManager: RCTViewManager {
    override static func requiresMainQueueSetup() -> Bool {
        return true
    }

    override func view() -> UIView! {
        return SelfMRZScannerView()
    }

    override static func moduleName() -> String! {
        return "SelfMRZScannerView"
    }
}

class SelfMRZScannerView: UIView {
    @objc var onPassportRead: RCTDirectEventBlock?
    @objc var onError: RCTDirectEventBlock?

    private var hostingController: UIHostingController<SelfLiveMRZScannerView>?

    override init(frame: CGRect) {
        super.init(frame: frame)
        initializeScanner()
    }

    required init?(coder: NSCoder) {
        super.init(coder: coder)
        initializeScanner()
    }

    private func initializeScanner() {
        let scannerView = SelfLiveMRZScannerView(
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
