// SPDX-License-Identifier: BUSL-1.1; Copyright (c) 2025 Social Connect Labs, Inc.; Licensed under BUSL-1.1 (see LICENSE); Apache-2.0 from 2029-06-11

//
//  ScannerHostingController.swift
//  OpenPassport
//
//  Created by Rémi Colin on 27/02/2024.
//

import UIKit
import SwiftUI

class ScannerHostingController: UIViewController {
    override func viewDidLoad() {
        super.viewDidLoad()

        // Create the SwiftUI view that hosts the scanner view
        let scannerView = QKMRZScannerViewRepresentable()
            .frame(height: 300)

        // Use a UIHostingController to wrap the SwiftUI view
        let hostingController = UIHostingController(rootView: scannerView)

        // Make sure the hostingController's view does not have its own autoresizing mask constraints
        hostingController.view.translatesAutoresizingMaskIntoConstraints = false

        // Add the hosting controller as a child view controller
        self.addChild(hostingController)
        self.view.addSubview(hostingController.view)

        // Setup constraints for the hosting controller's view
        NSLayoutConstraint.activate([
            hostingController.view.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            hostingController.view.trailingAnchor.constraint(equalTo: view.trailingAnchor),
            hostingController.view.topAnchor.constraint(equalTo: view.topAnchor),
            hostingController.view.bottomAnchor.constraint(equalTo: view.bottomAnchor)
        ])

        // Complete the addition of the child view controller
        hostingController.didMove(toParent: self)
    }
}
