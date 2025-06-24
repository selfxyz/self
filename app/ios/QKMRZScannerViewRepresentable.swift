// SPDX-License-Identifier: BUSL-1.1; Copyright (c) 2025 Social Connect Labs, Inc.; Licensed under BUSL-1.1 (see LICENSE); Apache-2.0 from 2029-06-11

//
//  MRZScannerModule.swift
//  OpenPassport
//
//  Created by Rémi Colin on 27/02/2024.
//


import SwiftUI
import UIKit
import AVFoundation
import QKMRZScanner

struct QKMRZScannerViewRepresentable: UIViewRepresentable {
    // Add a closure property to handle scan results
    var onScanResult: ((QKMRZScanResult) -> Void)?

    class Coordinator: NSObject, QKMRZScannerViewDelegate {
        var parent: QKMRZScannerViewRepresentable

        init(_ parent: QKMRZScannerViewRepresentable) {
            self.parent = parent
        }

        func mrzScannerView(_ mrzScannerView: QKMRZScannerView, didFind scanResult: QKMRZScanResult) {

            // Call the closure with the scan result
            parent.onScanResult?(scanResult)

            DispatchQueue.main.async {
                mrzScannerView.stopScanning()

            }
        }
    }

    func makeCoordinator() -> Coordinator {
        Coordinator(self)
    }

    func makeUIView(context: Context) -> QKMRZScannerView {
        let scannerView = QKMRZScannerView()
        scannerView.delegate = context.coordinator

        // Check camera permission and start scanning
        checkCameraPermission { authorized in
            if authorized {
                scannerView.startScanning()
            } else {
                // Handle the case where camera access was not granted
                print("Camera access was denied or not determined. Please enable access in Settings.")
            }
        }

        return scannerView
    }

    func updateUIView(_ uiView: QKMRZScannerView, context: Context) {
        // Optionally, adjust or implement updates to the view here
    }

    private func checkCameraPermission(completion: @escaping (Bool) -> Void) {
        switch AVCaptureDevice.authorizationStatus(for: .video) {
        case .authorized:
            completion(true)
        case .notDetermined:
            AVCaptureDevice.requestAccess(for: .video) { granted in
                DispatchQueue.main.async {
                    completion(granted)
                }
            }
        default:
            completion(false)
        }
    }
}
