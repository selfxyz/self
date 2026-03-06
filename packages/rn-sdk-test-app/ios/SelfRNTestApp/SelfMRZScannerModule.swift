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

// MARK: - Detection State

private enum MrzDetectionState {
  case noText
  case textDetected
  case oneMrzLine
  case twoMrzLines

  var color: UIColor {
    switch self {
    case .noText:       return UIColor(red: 0.94, green: 0.33, blue: 0.31, alpha: 1) // Red 400
    case .textDetected: return UIColor(red: 1.00, green: 0.65, blue: 0.15, alpha: 1) // Orange 400
    case .oneMrzLine:   return UIColor(red: 1.00, green: 0.93, blue: 0.35, alpha: 1) // Yellow 400
    case .twoMrzLines:  return UIColor(red: 0.40, green: 0.73, blue: 0.42, alpha: 1) // Green 400
    }
  }

  var instructionText: String {
    switch self {
    case .noText:
      return "Position the MRZ (Machine Readable Zone) within the frame.\nThe MRZ is the two-line code at the bottom of your passport."
    case .textDetected:
      return "Text detected! Move closer to the MRZ code.\nMake sure the two-line code is clearly visible."
    case .oneMrzLine:
      return "One line detected! Almost there…\nHold steady and ensure both MRZ lines are in frame."
    case .twoMrzLines:
      return "Both lines detected! Reading passport data…\nKeep the passport steady."
    }
  }
}

// MARK: - Viewfinder Overlay

private final class MrzViewfinderOverlay: UIView {
  private let frameWidthRatio: CGFloat = 0.85
  private let frameHeightRatio: CGFloat = 0.25
  private let cornerRadiusValue: CGFloat = 12
  private let bracketLength: CGFloat = 40
  private let bracketThickness: CGFloat = 4
  private let frameBorderWidth: CGFloat = 3

  private var detectionState: MrzDetectionState = .noText
  private var pulseAlpha: CGFloat = 1.0
  private var pulseTimer: CADisplayLink?

  private var pulseDirection: CGFloat = -1
  private let pulseSpeed: CGFloat = 1.4 // full cycle ~1.4s

  func setDetectionState(_ state: MrzDetectionState) {
    let changed = detectionState != state
    detectionState = state

    if state == .twoMrzLines {
      if pulseTimer == nil { startPulse() }
    } else {
      stopPulse()
      pulseAlpha = 1.0
    }

    if changed { setNeedsDisplay() }
  }

  private func startPulse() {
    let link = CADisplayLink(target: self, selector: #selector(pulseTick))
    link.add(to: .main, forMode: .common)
    pulseTimer = link
  }

  private func stopPulse() {
    pulseTimer?.invalidate()
    pulseTimer = nil
  }

  @objc private func pulseTick() {
    let dt = pulseTimer?.duration ?? (1.0 / 60.0)
    pulseAlpha += pulseDirection * CGFloat(dt) * pulseSpeed
    if pulseAlpha <= 0.3 { pulseAlpha = 0.3; pulseDirection = 1 }
    if pulseAlpha >= 1.0 { pulseAlpha = 1.0; pulseDirection = -1 }
    setNeedsDisplay()
  }

  deinit { stopPulse() }

  override func draw(_ rect: CGRect) {
    guard let ctx = UIGraphicsGetCurrentContext() else { return }

    let fw = bounds.width * frameWidthRatio
    let fh = bounds.height * frameHeightRatio
    let fx = (bounds.width - fw) / 2
    let fy = (bounds.height - fh) / 2
    let frameRect = CGRect(x: fx, y: fy, width: fw, height: fh)

    let alpha = detectionState == .twoMrzLines ? pulseAlpha : 1.0
    let color = detectionState.color.withAlphaComponent(alpha)

    // Frame border
    ctx.setStrokeColor(color.cgColor)
    ctx.setLineWidth(frameBorderWidth)
    let borderPath = UIBezierPath(roundedRect: frameRect, cornerRadius: cornerRadiusValue)
    ctx.addPath(borderPath.cgPath)
    ctx.strokePath()

    // Corner brackets
    ctx.setStrokeColor(color.cgColor)
    ctx.setLineWidth(bracketThickness)
    ctx.setLineCap(.round)

    let bl = bracketLength
    let r = frameRect

    // Top-left
    ctx.move(to: CGPoint(x: r.minX, y: r.minY + bl))
    ctx.addLine(to: CGPoint(x: r.minX, y: r.minY))
    ctx.addLine(to: CGPoint(x: r.minX + bl, y: r.minY))
    ctx.strokePath()

    // Top-right
    ctx.move(to: CGPoint(x: r.maxX, y: r.minY + bl))
    ctx.addLine(to: CGPoint(x: r.maxX, y: r.minY))
    ctx.addLine(to: CGPoint(x: r.maxX - bl, y: r.minY))
    ctx.strokePath()

    // Bottom-left
    ctx.move(to: CGPoint(x: r.minX, y: r.maxY - bl))
    ctx.addLine(to: CGPoint(x: r.minX, y: r.maxY))
    ctx.addLine(to: CGPoint(x: r.minX + bl, y: r.maxY))
    ctx.strokePath()

    // Bottom-right
    ctx.move(to: CGPoint(x: r.maxX, y: r.maxY - bl))
    ctx.addLine(to: CGPoint(x: r.maxX, y: r.maxY))
    ctx.addLine(to: CGPoint(x: r.maxX - bl, y: r.maxY))
    ctx.strokePath()
  }
}

// MARK: - Scanner View Controller

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

  private let viewfinderOverlay = MrzViewfinderOverlay()
  private let instructionLabel = UILabel()

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

    viewfinderOverlay.backgroundColor = .clear
    viewfinderOverlay.isOpaque = false
    viewfinderOverlay.translatesAutoresizingMaskIntoConstraints = false

    instructionLabel.text = MrzDetectionState.noText.instructionText
    instructionLabel.textColor = .white
    instructionLabel.backgroundColor = UIColor.black.withAlphaComponent(0.75)
    instructionLabel.textAlignment = .center
    instructionLabel.numberOfLines = 0
    instructionLabel.font = UIFont.systemFont(ofSize: 14)
    instructionLabel.translatesAutoresizingMaskIntoConstraints = false
    instructionLabel.layer.cornerRadius = 10
    instructionLabel.layer.masksToBounds = true
    instructionLabel.layoutMargins = UIEdgeInsets(top: 12, left: 16, bottom: 12, right: 16)

    let privacyLabel = UILabel()
    privacyLabel.text = "No photo is captured"
    privacyLabel.textColor = .white
    privacyLabel.font = UIFont.systemFont(ofSize: 12)
    privacyLabel.backgroundColor = UIColor.black.withAlphaComponent(0.75)
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

    view.addSubview(viewfinderOverlay)
    view.addSubview(instructionLabel)
    view.addSubview(privacyLabel)
    view.addSubview(cancelButton)

    NSLayoutConstraint.activate([
      viewfinderOverlay.topAnchor.constraint(equalTo: view.topAnchor),
      viewfinderOverlay.leadingAnchor.constraint(equalTo: view.leadingAnchor),
      viewfinderOverlay.trailingAnchor.constraint(equalTo: view.trailingAnchor),
      viewfinderOverlay.bottomAnchor.constraint(equalTo: view.bottomAnchor),

      instructionLabel.topAnchor.constraint(equalTo: view.safeAreaLayoutGuide.topAnchor, constant: 20),
      instructionLabel.leadingAnchor.constraint(equalTo: view.leadingAnchor, constant: 20),
      instructionLabel.trailingAnchor.constraint(equalTo: view.trailingAnchor, constant: -20),

      privacyLabel.bottomAnchor.constraint(equalTo: cancelButton.topAnchor, constant: -18),
      privacyLabel.centerXAnchor.constraint(equalTo: view.centerXAnchor),
      privacyLabel.widthAnchor.constraint(lessThanOrEqualTo: view.widthAnchor, multiplier: 0.8),

      cancelButton.bottomAnchor.constraint(equalTo: view.safeAreaLayoutGuide.bottomAnchor, constant: -24),
      cancelButton.centerXAnchor.constraint(equalTo: view.centerXAnchor),
      cancelButton.widthAnchor.constraint(equalToConstant: 140),
      cancelButton.heightAnchor.constraint(equalToConstant: 44)
    ])
  }

  private func updateDetectionState(_ state: MrzDetectionState) {
    DispatchQueue.main.async { [weak self] in
      guard let self = self else { return }
      self.instructionLabel.text = state.instructionText
      self.viewfinderOverlay.setDetectionState(state)
    }
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

      let detectionState = SelfMrzSwiftParser.detectState(lines: recognizedLines)
      self.updateDetectionState(detectionState)

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

// MARK: - MRZ Parser

private struct SelfMrzSwiftResult {
  let documentNumber: String
  let dateOfBirth: String
  let dateOfExpiry: String
}

private enum SelfMrzSwiftParser {
  private static let td3Regex = try! NSRegularExpression(pattern: "^[A-Z0-9<]{44}$")
  private static let td1Regex = try! NSRegularExpression(pattern: "^[A-Z0-9<]{30}$")

  static func detectState(lines: [String]) -> MrzDetectionState {
    let normalized = lines
      .map { $0.uppercased().replacingOccurrences(of: " ", with: "") }
      .filter { !$0.isEmpty }

    if normalized.isEmpty { return .noText }

    let td3Count = normalized.filter { matches(td3Regex, text: $0) }.count
    let td1Count = normalized.filter { matches(td1Regex, text: $0) }.count

    if td3Count >= 2 || td1Count >= 3 { return .twoMrzLines }
    if td3Count >= 1 || td1Count >= 1 { return .oneMrzLine }

    return .textDetected
  }

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
