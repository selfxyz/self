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
    private var shouldBeScanning = true

    private var hostingController: UIHostingController<LiveMRZScannerView>?
    private var cameraCoordinator: CameraCoordinator?

    // Property to control scanning state from React Native
    @objc var isMounted: Bool = true {
        didSet {
            shouldBeScanning = isMounted
            updateScannerState()
        }
    }

    override init(frame: CGRect) {
        super.init(frame: frame)
        setupLifecycleObservers()
        initializeScanner()
    }

    required init?(coder: NSCoder) {
        super.init(coder: coder)
        setupLifecycleObservers()
        initializeScanner()
    }

    deinit {
        removeLifecycleObservers()
    }

    private func setupLifecycleObservers() {
        NotificationCenter.default.addObserver(
            self,
            selector: #selector(appDidEnterBackground),
            name: UIApplication.didEnterBackgroundNotification,
            object: nil
        )

        NotificationCenter.default.addObserver(
            self,
            selector: #selector(appWillEnterForeground),
            name: UIApplication.willEnterForegroundNotification,
            object: nil
        )
    }

    private func removeLifecycleObservers() {
        NotificationCenter.default.removeObserver(self)
    }

    @objc private func appDidEnterBackground() {
        shouldBeScanning = false
        updateScannerState()
    }

    @objc private func appWillEnterForeground() {
        shouldBeScanning = isMounted
        updateScannerState()
    }

    private func updateScannerState() {
        if shouldBeScanning {
            cameraCoordinator?.resumeCamera()
        } else {
            cameraCoordinator?.pauseCamera()
        }
    }

    private func initializeScanner() {
        // Only initialize if we should be scanning
        guard shouldBeScanning else { return }

        // Remove existing scanner if any
        hostingController?.view.removeFromSuperview()
        hostingController = nil

        // Create camera coordinator
        cameraCoordinator = CameraCoordinator()

        let scannerView = LiveMRZScannerView(
            onScanResultAsDict: { [weak self] resultDict in
                // Only process results if we should be scanning
                guard let self = self, self.shouldBeScanning else { return }

                self.onPassportRead?([
                    "data": [
                        "documentNumber": resultDict["documentNumber"] as? String ?? "",
                        "expiryDate": resultDict["expiryDate"] as? String ?? "",
                        "birthDate": resultDict["dateOfBirth"] as? String ?? "",
                        "documentType": resultDict["documentType"] as? String ?? "",
                        "countryCode": resultDict["countryCode"] as? String ?? ""
                    ]
                ])
            },
            cameraCoordinator: cameraCoordinator
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
