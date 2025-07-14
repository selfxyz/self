// SPDX-License-Identifier: BUSL-1.1; Copyright (c) 2025 Social Connect Labs, Inc.; Licensed under BUSL-1.1 (see LICENSE); Apache-2.0 from 2029-06-11

//
//  QRCodeScannerViewManager.swift
//  OpenPassport
//
//  Created by Rémi Colin on 07/02/2025.
//

import AVFoundation
import Foundation
import React

@objc(QRCodeScannerViewManager)
class QRCodeScannerViewManager: RCTViewManager {
  override static func requiresMainQueueSetup() -> Bool {
    return true
  }

  override func view() -> UIView! {
    return QRCodeScannerView()
  }
}

class QRCodeScannerView: UIView, AVCaptureMetadataOutputObjectsDelegate {
  var captureSession: AVCaptureSession?
  var previewLayer: AVCaptureVideoPreviewLayer?
  private var isSessionRunning = false
  private var shouldBeScanning = true

  // This property will hold the callback from JS
  @objc var onQRData: RCTDirectEventBlock?

  // Property to control scanning state from React Native
  @objc var isMounted: Bool = true {
    didSet {
      shouldBeScanning = isMounted
      if shouldBeScanning {
        startCameraSession()
      } else {
        stopCameraSession()
      }
    }
  }

  override init(frame: CGRect) {
    super.init(frame: frame)
    initializeScanner()
    setupLifecycleObservers()
  }

  required init?(coder: NSCoder) {
    super.init(coder: coder)
    initializeScanner()
    setupLifecycleObservers()
  }

  deinit {
    stopCameraSession()
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
    stopCameraSession()
  }

  @objc private func appWillEnterForeground() {
    if shouldBeScanning {
      startCameraSession()
    }
  }

  func initializeScanner() {
    captureSession = AVCaptureSession()
    guard let videoCaptureDevice = AVCaptureDevice.default(for: .video),
      let videoInput = try? AVCaptureDeviceInput(device: videoCaptureDevice),
      captureSession!.canAddInput(videoInput)
    else {
      return
    }
    captureSession!.addInput(videoInput)

    let metadataOutput = AVCaptureMetadataOutput()
    if captureSession!.canAddOutput(metadataOutput) {
      captureSession!.addOutput(metadataOutput)
      metadataOutput.setMetadataObjectsDelegate(self, queue: DispatchQueue.main)
      metadataOutput.metadataObjectTypes = [.qr]
    } else {
      return
    }

    previewLayer = AVCaptureVideoPreviewLayer(session: captureSession!)
    previewLayer?.videoGravity = .resizeAspectFill
    previewLayer?.frame = self.layer.bounds
    if let previewLayer = previewLayer {
      self.layer.addSublayer(previewLayer)
    }

    // Start the session only if we should be scanning
    if shouldBeScanning {
      startCameraSession()
    }
  }

  private func startCameraSession() {
    guard let captureSession = captureSession, !isSessionRunning, shouldBeScanning else { return }

    DispatchQueue.global(qos: .background).async {
      captureSession.startRunning()
      DispatchQueue.main.async {
        self.isSessionRunning = true
      }
    }
  }

  private func stopCameraSession() {
    guard let captureSession = captureSession, isSessionRunning else { return }

    DispatchQueue.global(qos: .background).async {
      captureSession.stopRunning()
      DispatchQueue.main.async {
        self.isSessionRunning = false
      }
    }
  }

  func metadataOutput(
    _ output: AVCaptureMetadataOutput, didOutput metadataObjects: [AVMetadataObject],
    from connection: AVCaptureConnection
  ) {
    // Only process QR codes if we should be scanning
    guard shouldBeScanning else { return }

    if let metadataObject = metadataObjects.first,
      let readableObject = metadataObject as? AVMetadataMachineReadableCodeObject,
      let stringValue = readableObject.stringValue
    {
      // Send the scanned QR code data to JS
      onQRData?(["data": stringValue])
      stopCameraSession()
    }
  }

  override func layoutSubviews() {
    super.layoutSubviews()
    previewLayer?.frame = self.bounds
  }
}
