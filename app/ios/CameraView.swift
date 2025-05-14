// CameraView.swift
// SwiftUI camera preview with frame capture callback

import SwiftUI
import AVFoundation

struct CameraView: UIViewControllerRepresentable {
    var frameHandler: (UIImage) -> Void
    var captureInterval: TimeInterval = 0.5 // seconds

    func makeUIViewController(context: Context) -> CameraViewController {
        let controller = CameraViewController()
        controller.frameHandler = frameHandler
        controller.captureInterval = captureInterval
        return controller
    }

    func updateUIViewController(_ uiViewController: CameraViewController, context: Context) {}
}

class CameraViewController: UIViewController, AVCaptureVideoDataOutputSampleBufferDelegate {
    var frameHandler: ((UIImage) -> Void)?
    var captureInterval: TimeInterval = 0.5
    private let session = AVCaptureSession()
    private let videoOutput = AVCaptureVideoDataOutput()
    private var lastCaptureTime = Date(timeIntervalSince1970: 0)
    private var previewLayer: AVCaptureVideoPreviewLayer?

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
        session.startRunning()
    }

    override func viewDidLayoutSubviews() {
        super.viewDidLayoutSubviews()
        previewLayer?.frame = view.bounds
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
            // Rotate to .up orientation
            let uprightImage = originalImage.fixedOrientation()
            DispatchQueue.main.async { [weak self] in
                self?.frameHandler?(uprightImage)
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