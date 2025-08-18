import { NativeModules, Platform } from 'react-native';

import type { ScannerAdapter, ScanOpts, ScanResult } from '../../types/public';

export const reactNativeScannerAdapter: ScannerAdapter = {
  async scan(opts: ScanOpts): Promise<ScanResult> {
    if (Platform.OS === 'ios') {
      return await scanIOS(opts);
    } else if (Platform.OS === 'android') {
      return await scanAndroid(opts);
    }
    throw new Error(`Platform ${Platform.OS} not supported`);
  },
};

async function scanIOS(opts: ScanOpts): Promise<ScanResult> {
  const { SelfMRZScannerModule, PassportReader } = NativeModules;

  if (!SelfMRZScannerModule) {
    throw new Error('SelfMRZScannerModule not found, check if its linked correctly');
  }

  switch (opts.mode) {
    case 'mrz':
      try {
        const result = await SelfMRZScannerModule.startScanning();
        return {
          mode: 'mrz',
          passportNumber: result.data.documentNumber,
          dateOfBirth: result.data.birthDate,
          dateOfExpiry: result.data.expiryDate,
          issuingCountry: result.data.countryCode,
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
          !!canNumber,
          skipPACE,
          skipCA,
          extendedMode,
          usePacePolling,
        );

        const passportData = JSON.parse(result);

        return {
          mode: 'nfc',
          passportNumber: passportData.documentNumber,
          dateOfBirth: passportData.dateOfBirth,
          dateOfExpiry: passportData.documentExpiryDate,
          issuingCountry: passportData.issuingAuthority,
          firstName: passportData.firstName,
          lastName: passportData.lastName,
          gender: passportData.gender,
          nationality: passportData.nationality,
          passportMRZ: passportData.passportMRZ,
          documentSigningCertificate: passportData.documentSigningCertificate,
          countrySigningCertificate: passportData.countrySigningCertificate,
          eContentBase64: passportData.eContentBase64,
          signatureBase64: passportData.signatureBase64,
          dataGroupHashes: passportData.dataGroupHashes,
          //TODO
          documentType: passportData.documentType,
          documentSubType: passportData.documentSubType,
          placeOfBirth: passportData.placeOfBirth,
          residenceAddress: passportData.residenceAddress,
          phoneNumber: passportData.phoneNumber,
          personalNumber: passportData.personalNumber,
          ldsVersion: passportData.LDSVersion,
          dataGroupsPresent: passportData.dataGroupsPresent,
          activeAuthenticationChallenge: passportData.activeAuthenticationChallenge,
          activeAuthenticationSignature: passportData.activeAuthenticationSignature,
          verificationErrors: passportData.verificationErrors,
          isPACESupported: passportData.isPACESupported,
          isChipAuthenticationSupported: passportData.isChipAuthenticationSupported,
          signatureAlgorithm: passportData.signatureAlgorithm,
          encapsulatedContentDigestAlgorithm: passportData.encapsulatedContentDigestAlgorithm,
          signedAttributes: passportData.signedAttributes,
          //TODO - do we need this? Some of these are based on the input and the passport
          verificationStatus: {
            passportCorrectlySigned: passportData.passportCorrectlySigned === 'true',
            documentSigningCertificateVerified: passportData.documentSigningCertificateVerified === 'true',
            passportDataNotTampered: passportData.passportDataNotTampered === 'true',
            activeAuthenticationPassed: passportData.activeAuthenticationPassed === 'true',
          },
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

async function scanAndroid(_opts: ScanOpts): Promise<ScanResult> {
  throw new Error('Android MRZ scanning not implemented yet');
}
