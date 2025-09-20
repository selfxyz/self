//
//  PhotoLibraryQRScannerViewController.swift
//  Self
//
//  Created by Rémi Colin on 09/09/2025.
//


// SPDX-License-Identifier: BUSL-1.1; Copyright (c) 2025 Social Connect Labs, Inc.; Licensed under BUSL-1.1 (see LICENSE); Apache-2.0 from 2029-06-11

//
//  PhotoLibraryQRScannerViewController.swift
//  OpenPassport
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
    guard let ciImage = CIImage(image: image) else {
      let error = NSError(
        domain: "QRScannerError",
        code: 1004,
        userInfo: [NSLocalizedDescriptionKey: "Failed to process the selected image."]
      )
      errorHandler?(error)
      dismiss(animated: true, completion: nil)
      return
    }

    let detector = CIDetector(
      ofType: CIDetectorTypeQRCode,
      context: nil,
      options: [CIDetectorAccuracy: CIDetectorAccuracyHigh]
    )

    guard let detector = detector else {
      let error = NSError(
        domain: "QRScannerError",
        code: 1005,
        userInfo: [NSLocalizedDescriptionKey: "Failed to initialize QR code detector."]
      )
      errorHandler?(error)
      dismiss(animated: true, completion: nil)
      return
    }

    let features = detector.features(in: ciImage) as? [CIQRCodeFeature] ?? []

    if let firstQRCode = features.first, let qrCodeString = firstQRCode.messageString {
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

