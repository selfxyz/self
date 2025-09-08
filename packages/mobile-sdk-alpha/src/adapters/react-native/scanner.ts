// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import { Buffer } from 'buffer';
import { NativeModules, Platform } from 'react-native';

import type { PassportData, ScannerAdapter, ScanOpts, ScanResult } from '../../types/public';

export const reactNativeScannerAdapter: ScannerAdapter = {
  async scan(opts: ScanOpts): Promise<ScanResult> {
    if (Platform.OS === 'ios') {
      return await scanIOS(opts);
    } else if (Platform.OS === 'android') {
      return await scanAndroid(opts);
    } else if (opts.mode === 'qr') {
      return { mode: 'qr', data: 'self://stub-qr' };
    }
    throw new Error(`Platform ${Platform.OS} not supported`);
  },
};

async function scanIOS(opts: ScanOpts): Promise<ScanResult> {
  const { SelfMRZScannerModule, PassportReader } = NativeModules;

  switch (opts.mode) {
    case 'mrz':
      if (!SelfMRZScannerModule) {
        throw new Error('SelfMRZScannerModule not found, check if its linked correctly');
      }
      try {
        const result = await SelfMRZScannerModule.startScanning();
        const documentType = result.data.documentType.startsWith('P') ? 'passport' : 'id_card';
        return {
          mode: 'mrz',
          mrzInfo: {
            documentNumber: result.data.documentNumber,
            dateOfBirth: result.data.birthDate,
            dateOfExpiry: result.data.expiryDate,
            issuingCountry: result.data.countryCode,
            documentType: documentType,
          },
        };
      } catch (error) {
        throw new Error(`MRZ scanning failed: ${error}`);
      }

    case 'nfc':
      if (!PassportReader) {
        throw new Error('PassportReader not found, check if its linked correctly');
      }

      try {
        const { passportNumber, dateOfBirth, dateOfExpiry, canNumber, skipPACE, skipCA, extendedMode, usePacePolling } =
          opts;

        if (!passportNumber || !dateOfBirth || !dateOfExpiry) {
          throw new Error('NFC scanning requires passportNumber, dateOfBirth, and dateOfExpiry');
        }

        const result = await PassportReader.scanPassport(
          passportNumber,
          dateOfBirth,
          dateOfExpiry,
          canNumber || '',
          !!canNumber || false,
          skipPACE || false,
          skipCA || false,
          extendedMode || false,
          usePacePolling || false,
        );

        const parsed = JSON.parse(String(result));
        const dgHashesObj = JSON.parse(parsed?.dataGroupHashes);
        const dg1HashString = dgHashesObj?.DG1?.sodHash;
        const dg1Hash = Array.from(Buffer.from(dg1HashString, 'hex'));
        const dg2HashString = dgHashesObj?.DG2?.sodHash;
        const dg2Hash = Array.from(Buffer.from(dg2HashString, 'hex'));

        const eContentBase64 = parsed?.eContentBase64;
        const signedAttributes = parsed?.signedAttributes;
        const mrz = parsed?.passportMRZ;
        const signatureBase64 = parsed?.signatureBase64;
        const documentSigningCertificate = parsed?.documentSigningCertificate;
        const pem = JSON.parse(documentSigningCertificate).PEM.replace(/\n/g, '');

        const eContentArray = Array.from(Buffer.from(signedAttributes, 'base64'));
        const signedEContentArray = eContentArray.map(byte => (byte > 127 ? byte - 256 : byte));

        const concatenatedDataHashesArray = Array.from(Buffer.from(eContentBase64, 'base64'));
        const concatenatedDataHashesArraySigned = concatenatedDataHashesArray.map(byte =>
          byte > 127 ? byte - 256 : byte,
        );

        const encryptedDigestArray = Array.from(Buffer.from(signatureBase64, 'base64')).map(byte =>
          byte > 127 ? byte - 256 : byte,
        );

        const document_type = mrz.length === 88 ? 'passport' : 'id_card';
        return {
          mode: 'nfc',
          passportData: {
            mrz: mrz,
            eContent: concatenatedDataHashesArraySigned,
            signedAttr: signedEContentArray,
            encryptedDigest: encryptedDigestArray,
            documentType: document_type,
            dsc: pem,
            dg2Hash: dg2Hash,
            dg1Hash: dg1Hash,
            dgPresents: parsed?.dataGroupsPresent,
            parsed: false,
            mock: false,
            documentCategory: document_type,
          } as PassportData,
        };
      } catch (error) {
        throw new Error(`NFC scanning failed: ${error}`);
      }

    case 'qr':
      throw new Error('QR scanning not implemented yet');

    default:
      throw new Error(`Unsupported scan mode`);
  }
}

async function scanAndroid(opts: ScanOpts): Promise<ScanResult> {
  const { SelfPassportReader: PassportReader, SelfMRZScannerModule } = NativeModules;
  if (opts.mode === 'nfc' && !PassportReader) {
    throw new Error('PassportReader not found, check if its linked correctly');
  }

  if (opts.mode === 'mrz' && !SelfMRZScannerModule) {
    throw new Error('SelfMRZScannerModule not found, check if its linked correctly');
  }

  switch (opts.mode) {
    case 'mrz':
      try {
        const result = await SelfMRZScannerModule.startScanning();
        const documentType = result.data.documentType.startsWith('P') ? 'passport' : 'id_card';
        return {
          mode: 'mrz',
          mrzInfo: {
            documentNumber: result.data.documentNumber,
            dateOfBirth: result.data.birthDate,
            dateOfExpiry: result.data.expiryDate,
            issuingCountry: result.data.countryCode,
            documentType: documentType,
          },
        };
      } catch (error) {
        throw new Error(`MRZ scanning failed: ${error}`);
      }

    case 'nfc':
      try {
        const { passportNumber, dateOfBirth, dateOfExpiry, canNumber } = opts;

        if (!passportNumber || !dateOfBirth || !dateOfExpiry) {
          throw new Error('NFC scanning requires passportNumber, dateOfBirth, and dateOfExpiry');
        }

        const scanOptions = {
          documentNumber: passportNumber,
          dateOfBirth: dateOfBirth,
          dateOfExpiry: dateOfExpiry,
          canNumber: canNumber || '',
          useCan: !!canNumber,
        };

        const result = await PassportReader.scan(scanOptions);

        const dgHashesObj = JSON.parse(result.dataGroupHashes);
        const dg1HashString = dgHashesObj['1'];
        const dg1Hash = Array.from(Buffer.from(dg1HashString, 'hex'));
        const dg2Hash = dgHashesObj['2'];
        const pem = '-----BEGIN CERTIFICATE-----' + result.documentSigningCertificate + '-----END CERTIFICATE-----';

        const dgPresents = Object.keys(dgHashesObj)
          .map(key => parseInt(key, 10))
          .filter(num => !isNaN(num))
          .sort((a, b) => a - b);

        const mrz_clean = result.mrz.replace(/\n/g, '');
        const document_type = mrz_clean.length === 88 ? 'passport' : 'id_card';

        return {
          mode: 'nfc',
          passportData: {
            mrz: mrz_clean,
            dsc: pem,
            dg2Hash: dg2Hash,
            dg1Hash: dg1Hash,
            dgPresents: dgPresents,
            eContent: JSON.parse(result.encapContent),
            signedAttr: JSON.parse(result.eContent),
            encryptedDigest: JSON.parse(result.encryptedDigest),
            documentType: document_type,
            documentCategory: document_type,
            parsed: false,
            mock: false,
          } as PassportData,
        };
      } catch (error) {
        throw new Error(`NFC scanning failed: ${error}`);
      }

    case 'qr':
      throw new Error('QR scanning not implemented yet');

    default:
      throw new Error(`Unsupported scan mode`);
  }
}
