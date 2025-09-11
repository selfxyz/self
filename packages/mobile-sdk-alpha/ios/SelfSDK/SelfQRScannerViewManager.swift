// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

//
//  SelfQRScannerViewManager.swift
//  SelfSDK
//
//  Created by Rémi Colin on 07/02/2025.
//

import AVFoundation
import Foundation
import React

@objc(SelfQRScannerViewManager)
class SelfQRScannerViewManager: RCTViewManager {
  override static func requiresMainQueueSetup() -> Bool {
    return true
  }

  override func view() -> UIView! {
    return SelfQRScannerView()
  }

  override static func moduleName() -> String! {
    return "SelfQRScannerView"
  }
}

class SelfQRScannerView: UIView, AVCaptureMetadataOutputObjectsDelegate {
  var captureSession: AVCaptureSession?
  var previewLayer: AVCaptureVideoPreviewLayer?

  // This property will hold the callback from JS
  @objc var onQRData: RCTDirectEventBlock?
  @objc var onError: RCTDirectEventBlock?

  override init(frame: CGRect) {
    super.init(frame: frame)
    initializeScanner()
  }

  required init?(coder: NSCoder) {
    super.init(coder: coder)
    initializeScanner()
  }

  func initializeScanner() {
    captureSession = AVCaptureSession()
    guard let videoCaptureDevice = AVCaptureDevice.default(for: .video),
      let videoInput = try? AVCaptureDeviceInput(device: videoCaptureDevice),
      captureSession!.canAddInput(videoInput)
    else {
      onError?(["errorMessage": "Camera not available", "error": "CAMERA_NOT_AVAILABLE", "stackTrace": ""])
      return
    }
    captureSession!.addInput(videoInput)

    let metadataOutput = AVCaptureMetadataOutput()
    if captureSession!.canAddOutput(metadataOutput) {
      captureSession!.addOutput(metadataOutput)
      metadataOutput.setMetadataObjectsDelegate(self, queue: DispatchQueue.main)
      metadataOutput.metadataObjectTypes = [.qr]
    } else {
      onError?(["errorMessage": "QR code scanning not supported", "error": "QR_NOT_SUPPORTED", "stackTrace": ""])
      return
    }

    previewLayer = AVCaptureVideoPreviewLayer(session: captureSession!)
    previewLayer?.videoGravity = .resizeAspectFill
    previewLayer?.frame = self.layer.bounds
    if let previewLayer = previewLayer {
      self.layer.addSublayer(previewLayer)
    }

    DispatchQueue.global(qos: .background).async {
      self.captureSession!.startRunning()
    }
  }

  func metadataOutput(
    _ output: AVCaptureMetadataOutput, didOutput metadataObjects: [AVMetadataObject],
    from connection: AVCaptureConnection
  ) {
    if let metadataObject = metadataObjects.first,
      let readableObject = metadataObject as? AVMetadataMachineReadableCodeObject,
      let stringValue = readableObject.stringValue
    {
      // Send the scanned QR code data to JS
      onQRData?(["data": stringValue])
      captureSession?.stopRunning()
    }
  }

  override func layoutSubviews() {
    super.layoutSubviews()
    previewLayer?.frame = self.bounds
  }
}
