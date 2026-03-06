// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import AVFoundation
import Foundation
import React
import SelfSdkSwift
import UIKit

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

  init(index: Int) {
    switch index {
    case 1:
      self = .textDetected
    case 2:
      self = .oneMrzLine
    case 3:
      self = .twoMrzLines
    default:
      self = .noText
    }
  }

  var color: UIColor {
    switch self {
    case .noText:       return UIColor(red: 0.94, green: 0.33, blue: 0.31, alpha: 1)
    case .textDetected: return UIColor(red: 1.00, green: 0.65, blue: 0.15, alpha: 1)
    case .oneMrzLine:   return UIColor(red: 1.00, green: 0.93, blue: 0.35, alpha: 1)
    case .twoMrzLines:  return UIColor(red: 0.40, green: 0.73, blue: 0.42, alpha: 1)
    }
  }

  var instructionText: String {
    switch self {
    case .noText:
      return "Position the MRZ (Machine Readable Zone) within the frame.\nThe MRZ is the two-line code at the bottom of your passport."
    case .textDetected:
      return "Text detected! Move closer to the MRZ code.\nMake sure the two-line code is clearly visible."
    case .oneMrzLine:
      return "One line detected! Almost there...\nHold steady and ensure both MRZ lines are in frame."
    case .twoMrzLines:
      return "Both lines detected! Reading passport data...\nKeep the passport steady."
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
  private let pulseSpeed: CGFloat = 1.4

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

  deinit {
    stopPulse()
  }

  override func draw(_ rect: CGRect) {
    guard let ctx = UIGraphicsGetCurrentContext() else { return }

    let frameWidth = bounds.width * frameWidthRatio
    let frameHeight = bounds.height * frameHeightRatio
    let frameX = (bounds.width - frameWidth) / 2
    let frameY = (bounds.height - frameHeight) / 2
    let frameRect = CGRect(x: frameX, y: frameY, width: frameWidth, height: frameHeight)

    let alpha = detectionState == .twoMrzLines ? pulseAlpha : 1.0
    let color = detectionState.color.withAlphaComponent(alpha)

    ctx.setStrokeColor(color.cgColor)
    ctx.setLineWidth(frameBorderWidth)
    let borderPath = UIBezierPath(roundedRect: frameRect, cornerRadius: cornerRadiusValue)
    ctx.addPath(borderPath.cgPath)
    ctx.strokePath()

    ctx.setStrokeColor(color.cgColor)
    ctx.setLineWidth(bracketThickness)
    ctx.setLineCap(.round)

    let length = bracketLength
    let rect = frameRect

    ctx.move(to: CGPoint(x: rect.minX, y: rect.minY + length))
    ctx.addLine(to: CGPoint(x: rect.minX, y: rect.minY))
    ctx.addLine(to: CGPoint(x: rect.minX + length, y: rect.minY))
    ctx.strokePath()

    ctx.move(to: CGPoint(x: rect.maxX, y: rect.minY + length))
    ctx.addLine(to: CGPoint(x: rect.maxX, y: rect.minY))
    ctx.addLine(to: CGPoint(x: rect.maxX - length, y: rect.minY))
    ctx.strokePath()

    ctx.move(to: CGPoint(x: rect.minX, y: rect.maxY - length))
    ctx.addLine(to: CGPoint(x: rect.minX, y: rect.maxY))
    ctx.addLine(to: CGPoint(x: rect.minX + length, y: rect.maxY))
    ctx.strokePath()

    ctx.move(to: CGPoint(x: rect.maxX, y: rect.maxY - length))
    ctx.addLine(to: CGPoint(x: rect.maxX, y: rect.maxY))
    ctx.addLine(to: CGPoint(x: rect.maxX - length, y: rect.maxY))
    ctx.strokePath()
  }
}

// MARK: - Scanner View Controller

private final class SelfMrzScannerViewController: UIViewController {
  var onSuccess: (([String: String]) -> Void)?
  var onCancel: (() -> Void)?
  var onError: ((String, String) -> Void)?

  private let helper = MrzCameraHelper()
  private var hasCompleted = false
  private var scannerConfigured = false

  private let viewfinderOverlay = MrzViewfinderOverlay()
  private let instructionLabel = UILabel()

  override func viewDidLoad() {
    super.viewDidLoad()
    setupUI()
    setupScannerIfAuthorized()
  }

  override func viewDidAppear(_ animated: Bool) {
    super.viewDidAppear(animated)
    if scannerConfigured && !hasCompleted {
      helper.startCamera()
    }
  }

  override func viewDidDisappear(_ animated: Bool) {
    super.viewDidDisappear(animated)
    helper.stopCamera()
  }

  private func setupUI() {
    view.backgroundColor = .black

    let previewView = helper.createCameraPreviewView(frame: .zero)
    previewView.translatesAutoresizingMaskIntoConstraints = false
    view.addSubview(previewView)

    viewfinderOverlay.backgroundColor = .clear
    viewfinderOverlay.translatesAutoresizingMaskIntoConstraints = false
    view.addSubview(viewfinderOverlay)

    instructionLabel.textAlignment = .center
    instructionLabel.textColor = .white
    instructionLabel.font = UIFont.systemFont(ofSize: 16, weight: .medium)
    instructionLabel.numberOfLines = 0
    instructionLabel.text = MrzDetectionState.noText.instructionText
    instructionLabel.translatesAutoresizingMaskIntoConstraints = false
    view.addSubview(instructionLabel)

    let privacyLabel = UILabel()
    privacyLabel.textAlignment = .center
    privacyLabel.textColor = UIColor.white.withAlphaComponent(0.8)
    privacyLabel.font = UIFont.systemFont(ofSize: 13, weight: .regular)
    privacyLabel.numberOfLines = 2
    privacyLabel.text = "We only read your MRZ data\nand do not store camera frames"
    privacyLabel.translatesAutoresizingMaskIntoConstraints = false
    view.addSubview(privacyLabel)

    let cancelButton = UIButton(type: .system)
    cancelButton.setTitle("Cancel", for: .normal)
    cancelButton.tintColor = .white
    cancelButton.backgroundColor = UIColor(red: 0.07, green: 0.09, blue: 0.16, alpha: 0.85)
    cancelButton.layer.cornerRadius = 8
    cancelButton.titleLabel?.font = UIFont.systemFont(ofSize: 17, weight: .semibold)
    cancelButton.translatesAutoresizingMaskIntoConstraints = false
    cancelButton.addTarget(self, action: #selector(cancelTapped), for: .touchUpInside)
    view.addSubview(cancelButton)

    NSLayoutConstraint.activate([
      previewView.topAnchor.constraint(equalTo: view.topAnchor),
      previewView.leadingAnchor.constraint(equalTo: view.leadingAnchor),
      previewView.trailingAnchor.constraint(equalTo: view.trailingAnchor),
      previewView.bottomAnchor.constraint(equalTo: view.bottomAnchor),

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
      cancelButton.heightAnchor.constraint(equalToConstant: 44),
    ])
  }

  private func setupScannerIfAuthorized() {
    switch AVCaptureDevice.authorizationStatus(for: .video) {
    case .authorized:
      configureScannerCallbacks()
    case .notDetermined:
      AVCaptureDevice.requestAccess(for: .video) { [weak self] granted in
        guard let self = self else { return }
        DispatchQueue.main.async {
          guard granted else {
            self.failAndDismiss(code: "CAMERA_PERMISSION_DENIED", message: "Camera permission denied")
            return
          }
          self.configureScannerCallbacks()
          if self.isViewLoaded, self.view.window != nil, !self.hasCompleted {
            self.helper.startCamera()
          }
        }
      }
    case .restricted, .denied:
      failAndDismiss(code: "CAMERA_PERMISSION_DENIED", message: "Camera permission denied")
    @unknown default:
      failAndDismiss(code: "CAMERA_PERMISSION_DENIED", message: "Camera permission denied")
    }
  }

  private func configureScannerCallbacks() {
    guard helper.isCameraSessionConfigured else {
      failAndDismiss(code: "CAMERA_INIT_FAILED", message: "Failed to initialize camera session")
      return
    }
    scannerConfigured = true
    helper.scanMrzWithCallbacks(
      progress: { [weak self] stateIndex in
        guard let self = self, !self.hasCompleted else { return }
        self.updateDetectionState(MrzDetectionState(index: stateIndex))
      },
      completion: { [weak self] success, payload in
        guard let self = self, !self.hasCompleted else { return }
        if success {
          self.handleScanSuccess(payload)
        } else {
          self.failAndDismiss(code: "MRZ_SCAN_FAILED", message: payload.isEmpty ? "MRZ scan failed" : payload)
        }
      }
    )
  }

  private func updateDetectionState(_ state: MrzDetectionState) {
    DispatchQueue.main.async {
      self.instructionLabel.text = state.instructionText
      self.viewfinderOverlay.setDetectionState(state)
    }
  }

  private func handleScanSuccess(_ jsonPayload: String) {
    guard let data = jsonPayload.data(using: .utf8),
          let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
          let documentNumber = json["documentNumber"] as? String,
          let dateOfBirth = json["dateOfBirth"] as? String,
          let dateOfExpiry = json["dateOfExpiry"] as? String else {
      failAndDismiss(code: "MRZ_SCAN_FAILED", message: "MRZ scan failed")
      return
    }

    hasCompleted = true
    helper.stopCamera()

    DispatchQueue.main.async {
      self.onSuccess?([
        "documentNumber": documentNumber,
        "dateOfBirth": dateOfBirth,
        "dateOfExpiry": dateOfExpiry,
      ])
      self.dismiss(animated: true)
    }
  }

  private func failAndDismiss(code: String, message: String) {
    guard !hasCompleted else { return }
    hasCompleted = true
    helper.stopCamera()
    DispatchQueue.main.async {
      self.onError?(code, message)
      self.dismiss(animated: true)
    }
  }

  @objc private func cancelTapped() {
    guard !hasCompleted else { return }
    hasCompleted = true
    helper.stopCamera()
    onCancel?()
    dismiss(animated: true)
  }
}
