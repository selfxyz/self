// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import AVFoundation
import Foundation
import React
import UIKit
import Vision

@objc(SelfMRZScannerModule)
final class SelfMRZScannerModule: NSObject, RCTBridgeModule {
  private var resolveBlock: RCTPromiseResolveBlock?
  private var rejectBlock: RCTPromiseRejectBlock?
  private weak var scannerViewController: SelfMrzScannerViewController?

  static func moduleName() -> String! {
    "SelfMRZScannerModule"
  }

  static func requiresMainQueueSetup() -> Bool {
    true
  }

  @objc func startScanning(
    _ resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    DispatchQueue.main.async {
      guard self.resolveBlock == nil else {
        reject("MRZ_SCAN_IN_PROGRESS", "MRZ scanning already in progress", nil)
        return
      }

      guard let presenter = SelfMRZScannerModule.topViewController() else {
        reject("NO_VIEW_CONTROLLER", "Unable to find root view controller", nil)
        return
      }

      self.resolveBlock = resolve
      self.rejectBlock = reject

      let scanner = SelfMrzScannerViewController()
      scanner.onSuccess = { [weak self] result in
        guard let self = self else { return }
        self.resolveBlock?(result)
        self.clearCallbacks()
      }
      scanner.onCancel = { [weak self] in
        guard let self = self else { return }
        self.rejectBlock?("MRZ_SCAN_CANCELLED", "MRZ scanning cancelled", nil)
        self.clearCallbacks()
      }
      scanner.onError = { [weak self] code, message in
        guard let self = self else { return }
        self.rejectBlock?(code, message, nil)
        self.clearCallbacks()
      }

      self.scannerViewController = scanner
      scanner.modalPresentationStyle = .fullScreen
      presenter.present(scanner, animated: true)
    }
  }

  private func clearCallbacks() {
    resolveBlock = nil
    rejectBlock = nil
    scannerViewController = nil
  }

  private static func topViewController(
    from viewController: UIViewController? = UIApplication.shared.connectedScenes
      .compactMap { $0 as? UIWindowScene }
      .flatMap { $0.windows }
      .first(where: { $0.isKeyWindow })?
      .rootViewController
  ) -> UIViewController? {
    if let navigationController = viewController as? UINavigationController {
      return topViewController(from: navigationController.visibleViewController)
    }

    if let tabController = viewController as? UITabBarController,
       let selectedController = tabController.selectedViewController {
      return topViewController(from: selectedController)
    }

    if let presented = viewController?.presentedViewController {
      return topViewController(from: presented)
    }

    return viewController
  }
}

private final class SelfMrzScannerViewController: UIViewController, AVCaptureVideoDataOutputSampleBufferDelegate {
  var onSuccess: (([String: String]) -> Void)?
  var onCancel: (() -> Void)?
  var onError: ((String, String) -> Void)?

  private let captureSession = AVCaptureSession()
  private let videoOutput = AVCaptureVideoDataOutput()
  private let recognitionQueue = DispatchQueue(label: "com.selfxyz.rn.mrz.scanner")

  private var previewLayer: AVCaptureVideoPreviewLayer?
  private var isProcessingFrame = false
  private var hasCompleted = false
  private let guideFrame = UIView()

  override func viewDidLoad() {
    super.viewDidLoad()
    setupUI()
    setupCameraSession()
  }

  override func viewDidAppear(_ animated: Bool) {
    super.viewDidAppear(animated)
    recognitionQueue.async { [weak self] in
      self?.captureSession.startRunning()
    }
  }

  override func viewDidLayoutSubviews() {
    super.viewDidLayoutSubviews()
    previewLayer?.frame = view.bounds
  }

  override func viewWillDisappear(_ animated: Bool) {
    super.viewWillDisappear(animated)
    if captureSession.isRunning {
      recognitionQueue.async { [weak self] in
        self?.captureSession.stopRunning()
      }
    }
  }

  private func setupUI() {
    view.backgroundColor = .black

    let instructionLabel = UILabel()
    instructionLabel.text = "Align the MRZ lines inside the frame"
    instructionLabel.textColor = .white
    instructionLabel.backgroundColor = UIColor.black.withAlphaComponent(0.7)
    instructionLabel.textAlignment = .center
    instructionLabel.numberOfLines = 0
    instructionLabel.translatesAutoresizingMaskIntoConstraints = false
    instructionLabel.layer.cornerRadius = 10
    instructionLabel.layer.masksToBounds = true
    instructionLabel.layoutMargins = UIEdgeInsets(top: 10, left: 12, bottom: 10, right: 12)

    guideFrame.translatesAutoresizingMaskIntoConstraints = false
    guideFrame.layer.borderColor = UIColor.white.cgColor
    guideFrame.layer.borderWidth = 3
    guideFrame.layer.cornerRadius = 14
    guideFrame.backgroundColor = .clear

    let privacyLabel = UILabel()
    privacyLabel.text = "No photo is captured"
    privacyLabel.textColor = .white
    privacyLabel.backgroundColor = UIColor.black.withAlphaComponent(0.7)
    privacyLabel.textAlignment = .center
    privacyLabel.numberOfLines = 1
    privacyLabel.translatesAutoresizingMaskIntoConstraints = false
    privacyLabel.layer.cornerRadius = 8
    privacyLabel.layer.masksToBounds = true

    let cancelButton = UIButton(type: .system)
    cancelButton.setTitle("Cancel", for: .normal)
    cancelButton.tintColor = .white
    cancelButton.backgroundColor = UIColor(red: 0.07, green: 0.09, blue: 0.16, alpha: 0.85)
    cancelButton.layer.cornerRadius = 8
    cancelButton.titleLabel?.font = UIFont.systemFont(ofSize: 17, weight: .semibold)
    cancelButton.translatesAutoresizingMaskIntoConstraints = false
    cancelButton.addTarget(self, action: #selector(cancelTapped), for: .touchUpInside)

    view.addSubview(instructionLabel)
    view.addSubview(guideFrame)
    view.addSubview(privacyLabel)
    view.addSubview(cancelButton)

    NSLayoutConstraint.activate([
      instructionLabel.topAnchor.constraint(equalTo: view.safeAreaLayoutGuide.topAnchor, constant: 20),
      instructionLabel.leadingAnchor.constraint(equalTo: view.leadingAnchor, constant: 20),
      instructionLabel.trailingAnchor.constraint(equalTo: view.trailingAnchor, constant: -20),

      guideFrame.centerXAnchor.constraint(equalTo: view.centerXAnchor),
      guideFrame.centerYAnchor.constraint(equalTo: view.centerYAnchor),
      guideFrame.widthAnchor.constraint(equalToConstant: 340),
      guideFrame.heightAnchor.constraint(equalToConstant: 180),

      privacyLabel.bottomAnchor.constraint(equalTo: cancelButton.topAnchor, constant: -18),
      privacyLabel.centerXAnchor.constraint(equalTo: view.centerXAnchor),
      privacyLabel.widthAnchor.constraint(lessThanOrEqualTo: view.widthAnchor, multiplier: 0.8),

      cancelButton.bottomAnchor.constraint(equalTo: view.safeAreaLayoutGuide.bottomAnchor, constant: -24),
      cancelButton.centerXAnchor.constraint(equalTo: view.centerXAnchor),
      cancelButton.widthAnchor.constraint(equalToConstant: 140),
      cancelButton.heightAnchor.constraint(equalToConstant: 44)
    ])
  }

  private func setupCameraSession() {
    guard AVCaptureDevice.authorizationStatus(for: .video) != .denied else {
      onError?("CAMERA_PERMISSION_DENIED", "Camera permission denied")
      dismiss(animated: true)
      return
    }

    AVCaptureDevice.requestAccess(for: .video) { [weak self] granted in
      guard let self = self else { return }
      DispatchQueue.main.async {
        if !granted {
          self.onError?("CAMERA_PERMISSION_DENIED", "Camera permission denied")
          self.dismiss(animated: true)
          return
        }

        self.configureSessionInputs()
      }
    }
  }

  private func configureSessionInputs() {
    captureSession.beginConfiguration()
    captureSession.sessionPreset = .high

    guard let device = AVCaptureDevice.default(.builtInWideAngleCamera, for: .video, position: .back),
          let input = try? AVCaptureDeviceInput(device: device),
          captureSession.canAddInput(input) else {
      captureSession.commitConfiguration()
      onError?("CAMERA_INIT_FAILED", "Failed to initialize camera input")
      dismiss(animated: true)
      return
    }

    captureSession.addInput(input)

    videoOutput.alwaysDiscardsLateVideoFrames = true
    videoOutput.videoSettings = [
      kCVPixelBufferPixelFormatTypeKey as String: kCVPixelFormatType_32BGRA
    ]
    videoOutput.setSampleBufferDelegate(self, queue: recognitionQueue)

    guard captureSession.canAddOutput(videoOutput) else {
      captureSession.commitConfiguration()
      onError?("CAMERA_INIT_FAILED", "Failed to initialize camera output")
      dismiss(animated: true)
      return
    }

    captureSession.addOutput(videoOutput)
    captureSession.commitConfiguration()

    let layer = AVCaptureVideoPreviewLayer(session: captureSession)
    layer.videoGravity = .resizeAspectFill
    layer.frame = view.bounds
    view.layer.insertSublayer(layer, at: 0)
    previewLayer = layer
  }

  @objc private func cancelTapped() {
    guard !hasCompleted else { return }
    hasCompleted = true
    onCancel?()
    dismiss(animated: true)
  }

  func captureOutput(
    _ output: AVCaptureOutput,
    didOutput sampleBuffer: CMSampleBuffer,
    from connection: AVCaptureConnection
  ) {
    guard !hasCompleted, !isProcessingFrame,
          let pixelBuffer = CMSampleBufferGetImageBuffer(sampleBuffer) else {
      return
    }

    isProcessingFrame = true

    let request = VNRecognizeTextRequest { [weak self] request, _ in
      guard let self = self else { return }
      defer { self.isProcessingFrame = false }

      guard !self.hasCompleted,
            let observations = request.results as? [VNRecognizedTextObservation] else {
        return
      }

      let recognizedLines: [String] = observations
        .compactMap { observation in
          observation.topCandidates(1).first.map { (text: $0.string, y: observation.boundingBox.origin.y) }
        }
        .sorted { $0.y > $1.y }
        .map { $0.text }

      let parsed = SelfMrzSwiftParser.parse(lines: recognizedLines)
      guard let result = parsed else { return }

      self.hasCompleted = true
      self.captureSession.stopRunning()

      DispatchQueue.main.async {
        self.onSuccess?([
          "documentNumber": result.documentNumber,
          "dateOfBirth": result.dateOfBirth,
          "dateOfExpiry": result.dateOfExpiry
        ])
        self.dismiss(animated: true)
      }
    }

    request.recognitionLevel = .accurate
    request.usesLanguageCorrection = false

    do {
      let handler = VNImageRequestHandler(cvPixelBuffer: pixelBuffer, orientation: .up)
      try handler.perform([request])
    } catch {
      isProcessingFrame = false
    }
  }
}

private struct SelfMrzSwiftResult {
  let documentNumber: String
  let dateOfBirth: String
  let dateOfExpiry: String
}

private enum SelfMrzSwiftParser {
  private static let td3Regex = try! NSRegularExpression(pattern: "^[A-Z0-9<]{44}$")
  private static let td1Regex = try! NSRegularExpression(pattern: "^[A-Z0-9<]{30}$")

  static func parse(lines: [String]) -> SelfMrzSwiftResult? {
    guard let extracted = extractMrzLines(lines: lines) else {
      return nil
    }

    if extracted.count == 2, extracted[0].count == 44 {
      return parseTd3(line2: extracted[1])
    }

    if extracted.count == 3, extracted[0].count == 30 {
      return parseTd1(line1: extracted[0], line2: extracted[1])
    }

    return nil
  }

  private static func extractMrzLines(lines: [String]) -> [String]? {
    let normalized = lines
      .map { $0.uppercased().replacingOccurrences(of: " ", with: "") }
      .filter { !$0.isEmpty }

    let td3 = normalized.filter { matches(td3Regex, text: $0) }
    if td3.count >= 2 {
      if let first = td3.first(where: { $0.hasPrefix("P") || $0.hasPrefix("V") }),
         let index = td3.firstIndex(of: first),
         index + 1 < td3.count {
        return [td3[index], td3[index + 1]]
      }
      return Array(td3.suffix(2))
    }

    let td1 = normalized.filter { matches(td1Regex, text: $0) }
    if td1.count >= 3 {
      return Array(td1.suffix(3))
    }

    return nil
  }

  private static func parseTd3(line2: String) -> SelfMrzSwiftResult {
    let documentNumber = trimFiller(String(slice(line2, from: 0, length: 9)))
    let dateOfBirth = normalizeDate(String(slice(line2, from: 13, length: 6)))
    let dateOfExpiry = normalizeDate(String(slice(line2, from: 21, length: 6)))

    return SelfMrzSwiftResult(
      documentNumber: documentNumber,
      dateOfBirth: dateOfBirth,
      dateOfExpiry: dateOfExpiry
    )
  }

  private static func parseTd1(line1: String, line2: String) -> SelfMrzSwiftResult {
    let documentNumber = trimFiller(String(slice(line1, from: 5, length: 9)))
    let dateOfBirth = normalizeDate(String(slice(line2, from: 0, length: 6)))
    let dateOfExpiry = normalizeDate(String(slice(line2, from: 8, length: 6)))

    return SelfMrzSwiftResult(
      documentNumber: documentNumber,
      dateOfBirth: dateOfBirth,
      dateOfExpiry: dateOfExpiry
    )
  }

  private static func matches(_ regex: NSRegularExpression, text: String) -> Bool {
    let range = NSRange(location: 0, length: text.utf16.count)
    return regex.firstMatch(in: text, options: [], range: range) != nil
  }

  private static func trimFiller(_ value: String) -> String {
    value.replacingOccurrences(of: "<", with: "").trimmingCharacters(in: .whitespacesAndNewlines)
  }

  private static func normalizeDate(_ value: String) -> String {
    value.replacingOccurrences(of: "<", with: "0")
  }

  private static func slice(_ text: String, from start: Int, length: Int) -> Substring {
    let startIndex = text.index(text.startIndex, offsetBy: start)
    let endIndex = text.index(startIndex, offsetBy: length)
    return text[startIndex..<endIndex]
  }
}
