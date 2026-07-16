// SPDX-License-Identifier: BUSL-1.1; Copyright (c) 2025 Social Connect Labs, Inc.; Licensed under BUSL-1.1 (see LICENSE); Apache-2.0 from 2029-06-11

//
//  QRScannerBridge.swift
//  Self
//
//  Created by Rémi Colin on 23/07/2024.
//

import Foundation
import SwiftQRScanner
import React
import UIKit
import CoreImage
import PDFKit

@objc(QRScannerBridge)
class QRScannerBridge: NSObject {
  @objc
  static func requiresMainQueueSetup() -> Bool {
    return false
  }

  @objc
  func scanQRCode(_ resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
    DispatchQueue.main.async {
      let rootViewController = UIApplication.shared.keyWindow?.rootViewController
      let qrScannerViewController = QRScannerViewController()
      qrScannerViewController.completionHandler = { result in
        resolve(result)
      }
      rootViewController?.present(qrScannerViewController, animated: true, completion: nil)
    }
  }

  @objc
  func scanQRCodeFromPhotoLibrary(_ resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
    DispatchQueue.main.async {
      let rootViewController = UIApplication.shared.keyWindow?.rootViewController
      let photoLibraryQRScanner = PhotoLibraryQRScannerViewController()
      photoLibraryQRScanner.completionHandler = { result in
        resolve(result)
      }
      photoLibraryQRScanner.errorHandler = { error in
        reject("QR_SCAN_ERROR", error.localizedDescription, error)
      }
      rootViewController?.present(photoLibraryQRScanner, animated: true, completion: nil)
    }
  }

  @objc
  func scanQRCodeFromPDF(_ uri: String, password: String,
                         resolver resolve: @escaping RCTPromiseResolveBlock,
                         rejecter reject: @escaping RCTPromiseRejectBlock) {
    DispatchQueue.global(qos: .userInitiated).async {
      guard let url = PdfQRScanner.fileURL(from: uri) else {
        reject("PDF_OPEN_FAILED", "Invalid file URL", nil)
        return
      }
      guard let document = PDFDocument(url: url) else {
        reject("PDF_OPEN_FAILED", "Could not open PDF", nil)
        return
      }
      if document.isLocked {
        if !document.unlock(withPassword: password) {
          reject("INVALID_PASSWORD", "Incorrect password", nil)
          return
        }
      }
      if let qrCode = PdfQRScanner.findQR(in: document) {
        resolve(qrCode)
      } else {
        reject("QR_NOT_FOUND", "No QR code found in PDF", nil)
      }
    }
  }
}

/// Decrypts and rasterizes an e-Aadhaar PDF, then locates the Secure QR code.
/// The QR sits middle-right on the first page and lower-right on the last page;
/// we try a full-page decode first and fall back to a high-DPI crop of those
/// regions.
enum PdfQRScanner {
  private static let fullPageScale: CGFloat = 220.0 / 72.0
  private static let cropUpscale: CGFloat = 2.0

  // The Aadhaar Secure QR is a long numeric string; pages also carry
  // unrelated QRs (e.g. app-download links) that must not end the search.
  private static func isAadhaarSecureQr(_ value: String) -> Bool {
    value.count >= 100 && value.allSatisfy { $0.isASCII && $0.isNumber }
  }

  static func fileURL(from uri: String) -> URL? {
    if uri.hasPrefix("file://") {
      return URL(string: uri)
    }
    return URL(fileURLWithPath: uri)
  }

  static func findQR(in document: PDFDocument) -> String? {
    let pageCount = document.pageCount
    guard pageCount > 0 else { return nil }

    let firstIndex = 0
    let lastIndex = pageCount - 1
    // (pageIndex, normalized top-left-origin crop rect)
    let candidates: [(Int, CGRect)] = [
      (firstIndex, CGRect(x: 0.48, y: 0.22, width: 0.52, height: 0.56)),
      (lastIndex, CGRect(x: 0.48, y: 0.52, width: 0.52, height: 0.48)),
    ]

    var fullPageCache: [Int: UIImage] = [:]
    func fullPage(_ index: Int) -> UIImage? {
      if let cached = fullPageCache[index] { return cached }
      guard let page = document.page(at: index) else { return nil }
      let image = renderPage(page, scale: fullPageScale)
      fullPageCache[index] = image
      return image
    }

    // 1) Full-page decode on each unique page.
    var triedPages = Set<Int>()
    for (index, _) in candidates {
      guard !triedPages.contains(index) else { continue }
      triedPages.insert(index)
      if let image = fullPage(index),
         let qr = QRImageDecoder.decodeAll(image).first(where: isAadhaarSecureQr) {
        return qr
      }
    }

    // 2) High-DPI crop of the hinted region as a fallback.
    for (index, rect) in candidates {
      guard let image = fullPage(index),
            let cropped = QRImageDecoder.crop(image, normRect: rect, upscale: cropUpscale)
      else { continue }
      if let qr = QRImageDecoder.decodeAll(cropped).first(where: isAadhaarSecureQr) {
        return qr
      }
    }

    return nil
  }

  private static func renderPage(_ page: PDFPage, scale: CGFloat) -> UIImage {
    let bounds = page.bounds(for: .mediaBox)
    let size = CGSize(width: bounds.width * scale, height: bounds.height * scale)
    let format = UIGraphicsImageRendererFormat()
    format.scale = 1
    return UIGraphicsImageRenderer(size: size, format: format).image { context in
      let cg = context.cgContext
      UIColor.white.set()
      cg.fill(CGRect(origin: .zero, size: size))
      cg.translateBy(x: 0, y: size.height)
      cg.scaleBy(x: scale, y: -scale)
      cg.translateBy(x: -bounds.minX, y: -bounds.minY)
      if let pageRef = page.pageRef {
        cg.drawPDFPage(pageRef)
      }
    }
  }
}
