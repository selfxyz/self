// SPDX-License-Identifier: BUSL-1.1; Copyright (c) 2025 Social Connect Labs, Inc.; Licensed under BUSL-1.1 (see LICENSE); Apache-2.0 from 2029-06-11

// CameraView.swift
// SwiftUI camera preview with frame capture callback

import UIKit
import SwiftUI
import AVFoundation

struct CameraView: UIViewControllerRepresentable {
    var frameHandler: (UIImage, CGRect) -> Void
    var captureInterval: TimeInterval = 0.5 // seconds
    var showOverlay: Bool = true  // For debug purposes. Set this value in LiveMRZScannerView.swift

    func makeUIViewController(context: Context) -> CameraViewController {
        let controller = CameraViewController()
        controller.frameHandler = frameHandler
        controller.captureInterval = captureInterval
        controller.showOverlay = showOverlay
        return controller
    }

    func updateUIViewController(_ uiViewController: CameraViewController, context: Context) {
        uiViewController.showOverlay = showOverlay
    }
}

class CameraViewController: UIViewController, AVCaptureVideoDataOutputSampleBufferDelegate {
    var frameHandler: ((UIImage, CGRect) -> Void)?
    var captureInterval: TimeInterval = 0.5
    var showOverlay: Bool = false
    private let session = AVCaptureSession()
    private let videoOutput = AVCaptureVideoDataOutput()
    private var lastCaptureTime = Date(timeIntervalSince1970: 0)
    private var previewLayer: AVCaptureVideoPreviewLayer?
    private var roiOverlay: UIView? = nil

    override func viewDidLoad() {
        super.viewDidLoad()
        setupCamera()
    }

    private func setupCamera() {
        session.beginConfiguration()
        guard let device = AVCaptureDevice.default(.builtInWideAngleCamera, for: .video, position: .back),
              let input = try? AVCaptureDeviceInput(device: device) else { return }
        if session.canAddInput(input) { session.addInput(input) }
        videoOutput.setSampleBufferDelegate(self, queue: DispatchQueue(label: "camera.frame.queue"))
        if session.canAddOutput(videoOutput) { session.addOutput(videoOutput) }
        session.commitConfiguration()
        previewLayer = AVCaptureVideoPreviewLayer(session: session)
        previewLayer?.videoGravity = .resizeAspectFill
        previewLayer?.frame = view.bounds
        if let previewLayer = previewLayer {
            view.layer.addSublayer(previewLayer)
        }
        // ROI overlay - for debugging
        if showOverlay && roiOverlay == nil {
            let overlay = UIView()
            overlay.layer.borderColor = UIColor.green.cgColor
            overlay.layer.borderWidth = 2.0
            overlay.backgroundColor = UIColor.clear
            overlay.isUserInteractionEnabled = false
            view.addSubview(overlay)
            roiOverlay = overlay
        }
        session.startRunning()
    }

    private func calculateGreenBoxFrame() -> CGRect {
        guard let previewLayer = previewLayer else { return .zero }
        let videoRect = previewLayer.layerRectConverted(fromMetadataOutputRect: CGRect(x: 0, y: 0, width: 1, height: 1))
        let visibleRect = videoRect.intersection(view.bounds)

        //Lottie animation frame
        let lottieWidth = visibleRect.width * 1.3  // 130% of width
        let lottieHeight = visibleRect.height * 1.3  // 130% of height

        //bottom 25% of the Lottie animation
        let boxHeight = lottieHeight * 0.25

        // Center the box horizontally and ensure it's within bounds
        let boxX = max(0, (visibleRect.width - lottieWidth) / 2)
        let boxWidth = min(lottieWidth, visibleRect.width)

        //Vertical offset to move the ROI a bit up. 15% in this case
        let verticalOffset = visibleRect.height * 0.15

        //GreenBox should stay within the visible area
        let maxY = visibleRect.maxY - verticalOffset
        let minY = visibleRect.minY
        let boxY = max(minY, min(maxY - boxHeight, maxY - boxHeight))
        // let boxY = visibleRect.maxY - boxHeight
        return CGRect(x: boxX, y: boxY, width: boxWidth, height: boxHeight)
    }

    var roiInImageCoordinates: CGRect {
        guard let previewLayer = previewLayer else { return .zero }
        let videoRect = previewLayer.layerRectConverted(fromMetadataOutputRect: CGRect(x: 0, y: 0, width: 1, height: 1))
        let greenBox = calculateGreenBoxFrame()
        // map greenBox to normalized coordinates within videoRect
        let normX = (greenBox.minX - videoRect.minX) / videoRect.width
        let normY = (greenBox.minY - videoRect.minY) / videoRect.height
        let normWidth = greenBox.width / videoRect.width
        let normHeight = greenBox.height / videoRect.height
        // Ensure normalized coordinates are within [0,1] bounds as vision's max ROI is (0,0) to (1,1)
        let clampedX = max(0, min(1, normX))
        let clampedY = max(0, min(1, normY))
        let clampedWidth = max(0, min(1 - clampedX, normWidth))
        let clampedHeight = max(0, min(1 - clampedY, normHeight))

        // Vision expects (0,0) at bottom-left, so flip Y
        let roiYVision = 1.0 - clampedY - clampedHeight
        let roi = CGRect(x: clampedX, y: roiYVision, width: clampedWidth, height: clampedHeight)

        // print("[CameraViewController] FINAL ROI for Vision (flipped Y, visible only): \(roi)")
        return roi
    }

    override func viewDidLayoutSubviews() {
        super.viewDidLayoutSubviews()
        // Ensure previewLayer matches the visible area
        previewLayer?.frame = view.bounds
        print("[CameraViewController] view.bounds: \(view.bounds)")
        if let overlay = roiOverlay {
            overlay.isHidden = !showOverlay
            overlay.frame = calculateGreenBoxFrame()
        }
    }

    func captureOutput(_ output: AVCaptureOutput, didOutput sampleBuffer: CMSampleBuffer, from connection: AVCaptureConnection) {
        let now = Date()
        guard now.timeIntervalSince(lastCaptureTime) >= captureInterval else { return }
        lastCaptureTime = now
        guard let imageBuffer = CMSampleBufferGetImageBuffer(sampleBuffer) else { return }
        let ciImage = CIImage(cvPixelBuffer: imageBuffer)
        let context = CIContext()
        if let cgImage = context.createCGImage(ciImage, from: ciImage.extent) {
            let originalImage = UIImage(cgImage: cgImage, scale: UIScreen.main.scale, orientation: .right)
            let uprightImage = originalImage.fixedOrientation()
            // print("[CameraViewController] cgImage size: \(cgImage.width)x\(cgImage.height), preview size: \(view.bounds.size), orientation: \(uprightImage.imageOrientation.rawValue)")
            let roi = roiInImageCoordinates
            DispatchQueue.main.async { [weak self] in
                self?.frameHandler?(uprightImage, roi)
            }
        }
    }
}

extension UIImage {
    func fixedOrientation() -> UIImage {
        if imageOrientation == .up { return self }
        UIGraphicsBeginImageContextWithOptions(size, false, scale)
        draw(in: CGRect(origin: .zero, size: size))
        let normalizedImage = UIGraphicsGetImageFromCurrentImageContext() ?? self
        UIGraphicsEndImageContext()
        return normalizedImage
    }
}
