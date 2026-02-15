//
//  MrzCameraHelper.swift
//  Self KMP Test App
//
//  Swift wrapper for camera MRZ scanning using AVFoundation + Vision framework
//  Exposes @objc API callable from Kotlin via cinterop
//

import Foundation
import UIKit
import AVFoundation
import Vision
import os.log

/// MRZ detection state matching Kotlin enum (0-3)
/// 0 = NO_TEXT, 1 = TEXT_DETECTED, 2 = ONE_MRZ_LINE, 3 = TWO_MRZ_LINES
public typealias MrzDetectionStateIndex = Int

/// Progress callback for MRZ detection
/// Parameters: detectionStateIndex
public typealias MrzProgressCallback = (MrzDetectionStateIndex) -> Void

/// Completion callback for MRZ scanning
/// Parameters: success, jsonResult (or error message if failed)
public typealias MrzCompletionCallback = (Bool, String) -> Void

@objc public class MrzCameraHelper: NSObject {

    private static let log = os.Logger(subsystem: "xyz.self.testapp", category: "MrzCamera")

    // Camera session
    private var captureSession: AVCaptureSession?
    private var previewLayer: AVCaptureVideoPreviewLayer?
    private var videoOutput: AVCaptureVideoDataOutput?

    // Vision requests
    private var textRecognitionRequest: VNRecognizeTextRequest?

    // Callbacks
    private var progressCallback: MrzProgressCallback?
    private var completionCallback: MrzCompletionCallback?

    // MRZ detection state
    private var mrzLine1: String?
    private var mrzLine2: String?
    private var currentDetectionState: MrzDetectionStateIndex = 0
    private var isScanning = false
    private var hasCompleted = false
    private var lastProgressUpdate: Date = Date()
    private let minProgressUpdateInterval: TimeInterval = 0.5 // 500ms

    @objc public override init() {
        super.init()
        setupVisionRequest()
    }

    /// Sets up the Vision text recognition request
    private func setupVisionRequest() {
        textRecognitionRequest = VNRecognizeTextRequest { [weak self] request, error in
            guard let self = self else { return }

            if let error = error {
                MrzCameraHelper.log.error("Text recognition error: \(error.localizedDescription)")
                return
            }

            self.processTextRecognitionResults(request.results as? [VNRecognizedTextObservation] ?? [])
        }

        textRecognitionRequest?.recognitionLevel = .accurate
        textRecognitionRequest?.usesLanguageCorrection = false
    }

    /// Creates and returns a UIView with camera preview
    /// This view should be embedded in the Compose UI via UIKitView
    @objc public func createCameraPreviewView(frame: CGRect) -> UIView {
        let containerView = UIView(frame: frame)
        containerView.backgroundColor = .black

        // Setup capture session
        setupCaptureSession(in: containerView)

        return containerView
    }

    /// Starts the camera session
    @objc public func startCamera() {
        isScanning = true

        DispatchQueue.global(qos: .userInitiated).async { [weak self] in
            self?.captureSession?.startRunning()
        }
    }

    /// Stops the camera session
    @objc public func stopCamera() {
        captureSession?.stopRunning()
        isScanning = false
        hasCompleted = false
        mrzLine1 = nil
        mrzLine2 = nil
        currentDetectionState = 0
    }

    /// Scans MRZ with progress callbacks
    @objc public func scanMrzWithCallbacks(
        progress: @escaping MrzProgressCallback,
        completion: @escaping MrzCompletionCallback
    ) {
        self.progressCallback = progress
        self.completionCallback = completion

        // Initial state
        progress(0) // NO_TEXT
    }

    // MARK: - Camera Setup

    private func setupCaptureSession(in containerView: UIView) {
        captureSession = AVCaptureSession()
        guard let captureSession = captureSession else { return }

        captureSession.beginConfiguration()
        captureSession.sessionPreset = .high

        // Add video input
        guard let videoCaptureDevice = AVCaptureDevice.default(.builtInWideAngleCamera, for: .video, position: .back) else {
            MrzCameraHelper.log.error("Failed to get camera device")
            return
        }

        guard let videoInput = try? AVCaptureDeviceInput(device: videoCaptureDevice) else {
            MrzCameraHelper.log.error("Failed to create video input")
            return
        }

        if captureSession.canAddInput(videoInput) {
            captureSession.addInput(videoInput)
        } else {
            MrzCameraHelper.log.error("Cannot add video input to session")
        }

        // Add video output
        videoOutput = AVCaptureVideoDataOutput()
        guard let videoOutput = videoOutput else { return }

        let delegateQueue = DispatchQueue(label: "videoQueue")
        videoOutput.setSampleBufferDelegate(self, queue: delegateQueue)

        videoOutput.videoSettings = [
            kCVPixelBufferPixelFormatTypeKey as String: kCVPixelFormatType_32BGRA
        ]

        if captureSession.canAddOutput(videoOutput) {
            captureSession.addOutput(videoOutput)
        } else {
            MrzCameraHelper.log.error("Cannot add video output to session")
        }

        captureSession.commitConfiguration()

        // Setup preview layer
        DispatchQueue.main.async {
            let previewLayer = AVCaptureVideoPreviewLayer(session: captureSession)
            previewLayer.frame = containerView.bounds
            previewLayer.videoGravity = .resizeAspectFill
            containerView.layer.addSublayer(previewLayer)
            self.previewLayer = previewLayer
        }
    }

    // MARK: - Vision Processing

    private func processTextRecognitionResults(_ observations: [VNRecognizedTextObservation]) {
        guard isScanning && !hasCompleted else { return }

        if observations.isEmpty {
            updateDetectionState(0) // NO_TEXT
            return
        }

        updateDetectionState(1) // TEXT_DETECTED

        // Look for MRZ patterns (TD3 passport: 2 lines of 44 characters each)
        // Keep observations paired with text for vertical sorting
        let mrzCandidates: [(text: String, y: CGFloat)] = observations.compactMap { observation in
            guard let topCandidate = observation.topCandidates(1).first else { return nil }
            let cleaned = topCandidate.string.replacingOccurrences(of: " ", with: "")
            guard cleaned.count >= 40 && cleaned.count <= 45 &&
                    cleaned.allSatisfy({ $0.isLetter || $0.isNumber || $0 == "<" }) else { return nil }
            return (text: cleaned, y: observation.boundingBox.origin.y)
        }

        if mrzCandidates.count >= 2 {
            // Sort by Y descending (Vision origin is bottom-left, so top line has larger Y)
            let sorted = mrzCandidates.sorted { $0.y > $1.y }
            let line1 = sorted[0].text.padding(toLength: 44, withPad: "<", startingAt: 0)
            let line2 = sorted[1].text.padding(toLength: 44, withPad: "<", startingAt: 0)

            // Validate MRZ format
            if validateMrzFormat(line1: line1, line2: line2) {
                mrzLine1 = line1
                mrzLine2 = line2
                updateDetectionState(3) // TWO_MRZ_LINES

                // Parse and complete
                if let mrzData = parseMrzData(line1: line1, line2: line2) {
                    hasCompleted = true  // Set flag before callback to prevent race condition
                    isScanning = false
                    DispatchQueue.main.async { [weak self] in
                        self?.completionCallback?(true, mrzData)
                    }
                } else {
                    MrzCameraHelper.log.error("MRZ parsing failed, JSON serialization error")
                }
            } else {
                updateDetectionState(2) // ONE_MRZ_LINE
            }
        } else if mrzCandidates.count == 1 {
            updateDetectionState(2) // ONE_MRZ_LINE
        }
    }

    private func validateMrzFormat(line1: String, line2: String) -> Bool {
        // TD3 passport format validation
        // Line 1: Type (1) + Country (3) + Name (39) + Check (1) = 44
        // Line 2: PassportNum (9) + Check (1) + Nationality (3) + DOB (6) + Check (1) + Sex (1) + Expiry (6) + Check (1) + Personal (14) + Check (2) = 44

        guard line1.count == 44 && line2.count == 44 else { return false }

        // Line 1 should start with 'P' (passport) or 'I' (ID card)
        let firstChar = line1.prefix(1)
        guard firstChar == "P" || firstChar == "I" else { return false }

        // Line 2 should have valid date formats (6 digits for DOB and expiry)
        let dobIndex = line2.index(line2.startIndex, offsetBy: 13)
        let expiryIndex = line2.index(line2.startIndex, offsetBy: 21)
        let dobString = String(line2[dobIndex..<line2.index(dobIndex, offsetBy: 6)])
        let expiryString = String(line2[expiryIndex..<line2.index(expiryIndex, offsetBy: 6)])

        return dobString.allSatisfy { $0.isNumber || $0 == "<" } &&
            expiryString.allSatisfy { $0.isNumber || $0 == "<" }
    }

    private func parseMrzData(line1: String, line2: String) -> String? {
        // Extract fields from MRZ
        // Line 2 format: PassportNum(9) + Check(1) + Nationality(3) + DOB(6) + Check(1) + Sex(1) + Expiry(6) + Check(1) + Personal(14) + Check(2)

        let passportNumber = String(line2.prefix(9)).trimmingCharacters(in: CharacterSet(charactersIn: "<"))
        let nationality = String(line2[line2.index(line2.startIndex, offsetBy: 10)..<line2.index(line2.startIndex, offsetBy: 13)])

        let dobIndex = line2.index(line2.startIndex, offsetBy: 13)
        let dateOfBirth = String(line2[dobIndex..<line2.index(dobIndex, offsetBy: 6)])

        let expiryIndex = line2.index(line2.startIndex, offsetBy: 21)
        let dateOfExpiry = String(line2[expiryIndex..<line2.index(expiryIndex, offsetBy: 6)])

        // Extract name from line 1 (positions 5-44)
        let nameField = String(line1.suffix(from: line1.index(line1.startIndex, offsetBy: 5)))
        let nameComponents = nameField.components(separatedBy: "<<")
        let lastName = nameComponents.first?.split(separator: "<").map { String($0) }.joined(separator: " ") ?? ""
        let firstName = nameComponents.dropFirst().joined(separator: "").split(separator: "<").map { String($0) }.joined(separator: " ")

        // Build JSON result
        let result: [String: Any] = [
            "documentNumber": passportNumber,
            "dateOfBirth": dateOfBirth,
            "dateOfExpiry": dateOfExpiry,
            "nationality": nationality,
            "lastName": lastName,
            "firstName": firstName,
            "mrzLine1": line1,
            "mrzLine2": line2
        ]

        do {
            let jsonData = try JSONSerialization.data(withJSONObject: result, options: [.prettyPrinted])
            return String(data: jsonData, encoding: .utf8)
        } catch {
            MrzCameraHelper.log.error("JSON serialization error: \(error.localizedDescription)")
            return nil
        }
    }

    private func updateDetectionState(_ newState: MrzDetectionStateIndex) {
        let now = Date()
        let shouldUpdate = (newState != currentDetectionState) ||
            (now.timeIntervalSince(lastProgressUpdate) >= minProgressUpdateInterval)

        if shouldUpdate {
            currentDetectionState = newState
            lastProgressUpdate = now
            DispatchQueue.main.async { [weak self] in
                self?.progressCallback?(newState)
            }
        }
    }
}

// MARK: - AVCaptureVideoDataOutputSampleBufferDelegate

extension MrzCameraHelper: AVCaptureVideoDataOutputSampleBufferDelegate {
    public func captureOutput(_ output: AVCaptureOutput, didOutput sampleBuffer: CMSampleBuffer, from connection: AVCaptureConnection) {
        guard let pixelBuffer = CMSampleBufferGetImageBuffer(sampleBuffer),
              let textRequest = textRecognitionRequest else {
            return
        }

        let requestHandler = VNImageRequestHandler(cvPixelBuffer: pixelBuffer, orientation: .up, options: [:])

        do {
            try requestHandler.perform([textRequest])
        } catch {
            MrzCameraHelper.log.error("Failed to perform text recognition: \(error)")
        }
    }
}
