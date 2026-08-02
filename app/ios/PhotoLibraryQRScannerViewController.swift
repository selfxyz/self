//
//  PhotoLibraryQRScannerViewController.swift
//  Self
//
//  Created by Rémi Colin on 09/09/2025.
//


// SPDX-License-Identifier: BUSL-1.1; Copyright (c) 2025 Social Connect Labs, Inc.; Licensed under BUSL-1.1 (see LICENSE); Apache-2.0 from 2029-06-11

//
//  PhotoLibraryQRScannerViewController.swift
//  Self
//
//  Created by AI Assistant on 01/03/2025.
//

import Foundation
import UIKit
import CoreImage
import Photos

class PhotoLibraryQRScannerViewController: UIViewController, UIImagePickerControllerDelegate, UINavigationControllerDelegate {
  var completionHandler: ((String) -> Void)?
  var errorHandler: ((Error) -> Void)?

  override func viewDidLoad() {
    super.viewDidLoad()
    checkPhotoLibraryPermissionAndPresentPicker()
  }

  private func checkPhotoLibraryPermissionAndPresentPicker() {
    let status = PHPhotoLibrary.authorizationStatus()

    switch status {
    case .authorized, .limited:
      presentImagePicker()
    case .notDetermined:
      PHPhotoLibrary.requestAuthorization { [weak self] status in
        DispatchQueue.main.async {
          if status == .authorized || status == .limited {
            self?.presentImagePicker()
          } else {
            self?.handlePermissionDenied()
          }
        }
      }
    case .denied, .restricted:
      handlePermissionDenied()
    @unknown default:
      handlePermissionDenied()
    }
  }

  private func presentImagePicker() {
    let imagePicker = UIImagePickerController()
    imagePicker.delegate = self
    imagePicker.sourceType = .photoLibrary
    imagePicker.mediaTypes = ["public.image"]
    present(imagePicker, animated: true, completion: nil)
  }

  private func handlePermissionDenied() {
    let error = NSError(
      domain: "QRScannerError",
      code: 1001,
      userInfo: [NSLocalizedDescriptionKey: "Photo library access is required to scan QR codes from photos. Please enable access in Settings."]
    )
    errorHandler?(error)
    dismiss(animated: true, completion: nil)
  }

  // MARK: - UIImagePickerControllerDelegate

  func imagePickerController(_ picker: UIImagePickerController, didFinishPickingMediaWithInfo info: [UIImagePickerController.InfoKey: Any]) {
    picker.dismiss(animated: true) { [weak self] in
      guard let self = self else { return }

      if let selectedImage = info[.originalImage] as? UIImage {
        self.detectQRCode(in: selectedImage)
      } else {
        let error = NSError(
          domain: "QRScannerError",
          code: 1002,
          userInfo: [NSLocalizedDescriptionKey: "Failed to load the selected image."]
        )
        self.errorHandler?(error)
        self.dismiss(animated: true, completion: nil)
      }
    }
  }

  func imagePickerControllerDidCancel(_ picker: UIImagePickerController) {
    picker.dismiss(animated: true) { [weak self] in
      let error = NSError(
        domain: "QRScannerError",
        code: 1003,
        userInfo: [NSLocalizedDescriptionKey: "User cancelled photo selection."]
      )
      self?.errorHandler?(error)
      self?.dismiss(animated: true, completion: nil)
    }
  }

  // MARK: - QR Code Detection

  private func detectQRCode(in image: UIImage) {
    if let qrCodeString = QRImageDecoder.decode(image) {
      completionHandler?(qrCodeString)
      dismiss(animated: true, completion: nil)
    } else {
      let error = NSError(
        domain: "QRScannerError",
        code: 1006,
        userInfo: [NSLocalizedDescriptionKey: "No QR code found in the selected image. Please try with a different image."]
      )
      errorHandler?(error)
      dismiss(animated: true, completion: nil)
    }
  }
}

/// Shared CoreImage QR decoding used by both the photo-library and PDF flows.
enum QRImageDecoder {
  /// Decodes the first QR code found in the image, or nil if none.
  static func decode(_ image: UIImage) -> String? {
    decodeAll(image).first
  }

  /// Decodes every QR code found in the image.
  static func decodeAll(_ image: UIImage) -> [String] {
    guard let ciImage = CIImage(image: image) else { return [] }
    let detector = CIDetector(
      ofType: CIDetectorTypeQRCode,
      context: nil,
      options: [CIDetectorAccuracy: CIDetectorAccuracyHigh]
    )
    let features = detector?.features(in: ciImage) as? [CIQRCodeFeature] ?? []
    return features.compactMap { $0.messageString }
  }

  /// Crops to a normalized (top-left origin) rect and optionally upscales, so a
  /// dense QR that is too small at full-page resolution can still be decoded.
  static func crop(_ image: UIImage, normRect: CGRect, upscale: CGFloat) -> UIImage? {
    guard let cg = image.cgImage else { return nil }
    let w = CGFloat(cg.width)
    let h = CGFloat(cg.height)
    let rect = CGRect(
      x: (normRect.minX * w).rounded(),
      y: (normRect.minY * h).rounded(),
      width: (normRect.width * w).rounded(),
      height: (normRect.height * h).rounded()
    ).intersection(CGRect(x: 0, y: 0, width: w, height: h))
    guard !rect.isNull, rect.width > 0, rect.height > 0,
          let cropped = cg.cropping(to: rect) else { return nil }
    if upscale <= 1 { return UIImage(cgImage: cropped) }
    let size = CGSize(width: rect.width * upscale, height: rect.height * upscale)
    let format = UIGraphicsImageRendererFormat()
    format.scale = 1
    return UIGraphicsImageRenderer(size: size, format: format).image { _ in
      UIImage(cgImage: cropped).draw(in: CGRect(origin: .zero, size: size))
    }
  }
}

