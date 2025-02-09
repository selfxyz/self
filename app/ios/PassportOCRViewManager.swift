import Foundation
import QKMRZScanner
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

    private var scannerView: QKMRZScannerViewRepresentable?
    private var hostingController: UIHostingController<QKMRZScannerViewRepresentable>?

    override init(frame: CGRect) {
        super.init(frame: frame)
        initializeScanner()
    }

    required init?(coder: NSCoder) {
        super.init(coder: coder)
        initializeScanner()
    }

    private func initializeScanner() {
        var scannerView = QKMRZScannerViewRepresentable()
        scannerView.onScanResult = { [weak self] scanResult in
            let resultDict: [String: Any] = [
                "documentNumber": scanResult.documentNumber,
                "expiryDate": scanResult.expiryDate?.description ?? "",
                "birthDate": scanResult.birthdate?.description ?? "",
            ]
            self?.onPassportRead?(["data": resultDict])
        }

        let hostingController = UIHostingController(rootView: scannerView)
        hostingController.view.backgroundColor = .clear
        hostingController.view.translatesAutoresizingMaskIntoConstraints = false
        addSubview(hostingController.view)

        self.scannerView = scannerView
        self.hostingController = hostingController
    }

    override func layoutSubviews() {
        super.layoutSubviews()
        hostingController?.view.frame = bounds
    }
}
