// SPDX-License-Identifier: BUSL-1.1; Copyright (c) 2025 Social Connect Labs, Inc.; Licensed under BUSL-1.1 (see LICENSE); Apache-2.0 from 2029-06-11

import { NativeModules, Platform } from 'react-native';

interface QRScannerBridge {
  scanQRCode: () => Promise<string>;
  scanQRCodeFromPhotoLibrary: () => Promise<string>;
  scanQRCodeFromPDF: (fileUri: string, password: string) => Promise<string>;
}

// Platform-specific QRScanner implementation
let QRScanner: QRScannerBridge | null = null;

if (Platform.OS === 'ios') {
  QRScanner = NativeModules.QRScannerBridge || null;
} else if (Platform.OS === 'android') {
  QRScanner = NativeModules.QRCodeScanner || null;
} else {
  console.warn('QRScanner: Unsupported platform');
  QRScanner = null;
}

export { QRScanner };

/**
 * Check if QR scanner camera is available
 */
export const isQRScannerCameraAvailable = (): boolean => {
  return QRScanner?.scanQRCode != null;
};

/**
 * Check if QR scanner photo library is available
 */
export const isQRScannerPhotoLibraryAvailable = (): boolean => {
  return QRScanner?.scanQRCodeFromPhotoLibrary != null;
};

/**
 * Check if scanning a QR code from a (password-protected) PDF is available
 */
export const isQRScannerPDFAvailable = (): boolean => {
  return QRScanner?.scanQRCodeFromPDF != null;
};

/**
 * Scans QR code from photo library
 * @returns Promise that resolves with the QR code content
 */
export const scanQRCodeFromPhotoLibrary = async (): Promise<string> => {
  if (!QRScanner?.scanQRCodeFromPhotoLibrary) {
    throw new Error('QR Scanner photo library not available on this platform');
  }

  return await QRScanner.scanQRCodeFromPhotoLibrary();
};

/**
 * Scans the Secure QR code from a password-protected e-Aadhaar PDF.
 * The native side decrypts the PDF with the supplied password, rasterizes the
 * relevant pages and decodes the QR, returning the same numeric QR string as
 * the photo-library flow.
 * @param fileUri Local file URI of the picked PDF
 * @param password User-supplied PDF password
 * @returns Promise that resolves with the QR code content
 */
export const scanQRCodeFromPDF = async (
  fileUri: string,
  password: string,
): Promise<string> => {
  if (!QRScanner?.scanQRCodeFromPDF) {
    throw new Error('QR Scanner PDF not available on this platform');
  }

  return await QRScanner.scanQRCodeFromPDF(fileUri, password);
};

/**
 * Scans QR code using device camera
 * @returns Promise that resolves with the QR code content
 */
export const scanQRCodeWithCamera = async (): Promise<string> => {
  if (!QRScanner?.scanQRCode) {
    throw new Error('QR Scanner not available on this platform');
  }

  return await QRScanner.scanQRCode();
};
