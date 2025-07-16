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
  private var sessionOperationQueue = DispatchQueue(label: "camera.session.queue", qos: .userInitiated)
  private var sessionOperationWorkItem: DispatchWorkItem?

  // This property will hold the callback from JS
  @objc var onQRData: RCTDirectEventBlock?
  @objc var onError: RCTDirectEventBlock?

  // Property to control scanning state from React Native
  @objc var isMounted: Bool = true {
    didSet {
      shouldBeScanning = isMounted
      // Debounce the session operations to prevent race conditions
      debounceSessionOperation()
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
    // Cancel any pending operations first
    sessionOperationWorkItem?.cancel()

    // Remove observers before any other cleanup
    removeLifecycleObservers()

    // Stop scanning on the main thread
    shouldBeScanning = false

    // Stop the session synchronously if it's running
    if isSessionRunning {
      captureSession?.stopRunning()
      isSessionRunning = false
    }
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

    NotificationCenter.default.addObserver(
      self,
      selector: #selector(appDidBecomeActive),
      name: UIApplication.didBecomeActiveNotification,
      object: nil
    )
  }

  private func removeLifecycleObservers() {
    NotificationCenter.default.removeObserver(self)
  }

  @objc private func appDidEnterBackground() {
    DispatchQueue.main.async { [weak self] in
      guard let self = self else { return }
      self.shouldBeScanning = false
      self.debounceSessionOperation()
    }
  }

  @objc private func appWillEnterForeground() {
    DispatchQueue.main.async { [weak self] in
      guard let self = self else { return }
      self.shouldBeScanning = self.isMounted
      self.debounceSessionOperation()
    }
  }

  @objc private func appDidBecomeActive() {
    // Check if camera permission was granted after returning from permission dialog
    if shouldBeScanning && !isSessionRunning {
      DispatchQueue.main.asyncAfter(deadline: .now() + 0.5) { [weak self] in
        self?.checkPermissionAndRetry()
      }
    }
  }

  private func checkPermissionAndRetry() {
    let authStatus = AVCaptureDevice.authorizationStatus(for: .video)
    if authStatus == .authorized && shouldBeScanning && !isSessionRunning {
      // Permission was granted, restart the camera
      print("[QRCodeScanner] Permission granted, restarting camera session")
      debounceSessionOperation()
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
      // Use main queue for metadata delegate to avoid threading issues
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
      debounceSessionOperation()
    }
  }

  private func debounceSessionOperation() {
    // Cancel any pending operation
    sessionOperationWorkItem?.cancel()

    // Create a new work item for the session operation
    let workItem = DispatchWorkItem { [weak self] in
      guard let self = self else { return }

      if self.shouldBeScanning {
        self.startCameraSession()
      } else {
        self.stopCameraSession()
      }
    }

    sessionOperationWorkItem = workItem

    // Execute after a short delay to debounce rapid changes
    DispatchQueue.main.asyncAfter(deadline: .now() + 0.1, execute: workItem)
  }

  private func startCameraSession() {
    guard let captureSession = captureSession, !isSessionRunning, shouldBeScanning else { return }

    sessionOperationQueue.async { [weak self] in
      guard let self = self else { return }

      // Check if we have camera permission
      let authStatus = AVCaptureDevice.authorizationStatus(for: .video)

      switch authStatus {
      case .authorized:
        // Permission granted, start the session
        break
      case .notDetermined:
        // Permission not yet requested, let iOS handle it by trying to start the session
        print("[QRCodeScanner] Permission not determined, iOS will show permission dialog")
        break
      case .denied, .restricted:
        // Permission explicitly denied or restricted
        DispatchQueue.main.async {
          self.onError?(["error": "Camera permission denied", "code": "PERMISSION_DENIED"])
        }
        return
      @unknown default:
        DispatchQueue.main.async {
          self.onError?(["error": "Unknown camera permission status", "code": "PERMISSION_UNKNOWN"])
        }
        return
      }

      do {
        // Start the capture session
        captureSession.startRunning()

        DispatchQueue.main.async {
          self.isSessionRunning = true
          print("[QRCodeScanner] Camera session started successfully")
        }
      } catch {
        DispatchQueue.main.async {
          self.isSessionRunning = false
          self.onError?(["error": "Failed to start camera session: \(error.localizedDescription)", "code": "SESSION_START_FAILED"])
        }
      }
    }
  }

  private func stopCameraSession() {
    guard let captureSession = captureSession, isSessionRunning else { return }

    sessionOperationQueue.async { [weak self] in
      guard let self = self else { return }

      do {
        // Stop the capture session
        captureSession.stopRunning()

        DispatchQueue.main.async {
          self.isSessionRunning = false
        }
      } catch {
        DispatchQueue.main.async {
          self.isSessionRunning = false
          self.onError?(["error": "Failed to stop camera session: \(error.localizedDescription)", "code": "SESSION_STOP_FAILED"])
        }
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
      // Already on main thread since delegate queue is set to DispatchQueue.main
      print("[QRCodeScanner] QR code detected: \(stringValue)")

      // Send the scanned QR code data to JS
      onQRData?(["data": stringValue])
      shouldBeScanning = false
      debounceSessionOperation()
    }
  }

  override func layoutSubviews() {
    super.layoutSubviews()
    previewLayer?.frame = self.bounds
  }
}
