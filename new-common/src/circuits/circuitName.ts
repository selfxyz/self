import type { IDDocument, KycData } from '../foundation/types/document.js';

function isKycDocument(doc: IDDocument): doc is KycData {
  return doc.documentCategory === 'kyc';
}

export function getCircuitNameFromPassportData(
  passportData: IDDocument,
  circuitType: 'register' | 'dsc',
) {
  if (circuitType === 'register') {
    return getRegisterNameFromPassportData(passportData);
  } else {
    return getDSCircuitNameFromPassportData(passportData);
  }
}

function getDSCircuitNameFromPassportData(passportData: IDDocument) {
  if (isKycDocument(passportData)) {
    throw new Error('KYC documents do not have a DSC circuit');
  }
  if (passportData.documentCategory === 'aadhaar') {
    throw new Error('Aadhaar does not have a DSC circuit');
  }
  if (!passportData.passportMetadata) {
    throw new Error('Passport data are not parsed');
  }
  const passportMetadata = passportData.passportMetadata;
  if (!passportMetadata.cscaFound) {
    throw new Error('CSCA not found');
  }
  const signatureAlgorithm = passportMetadata.cscaSignatureAlgorithm;
  const hashFunction = passportMetadata.cscaHashFunction;
  if (signatureAlgorithm === 'ecdsa') {
    const curve = passportMetadata.cscaCurveOrExponent;
    return `dsc_${hashFunction}_${signatureAlgorithm}_${curve}`;
  } else if (signatureAlgorithm === 'rsa') {
    const exponent = passportMetadata.cscaCurveOrExponent;
    const bits = passportMetadata.cscaSignatureAlgorithmBits;
    if (bits <= 4096) {
      return `dsc_${hashFunction}_${signatureAlgorithm}_${exponent}_${4096}`;
    } else {
      throw new Error(`Unsupported key length: ${bits}`);
    }
  } else if (signatureAlgorithm === 'rsapss') {
    const exponent = passportMetadata.cscaCurveOrExponent;
    const saltLength = passportMetadata.cscaSaltLength;
    const bits = passportMetadata.cscaSignatureAlgorithmBits;
    if (bits <= 4096) {
      return `dsc_${hashFunction}_${signatureAlgorithm}_${exponent}_${saltLength}_${bits}`;
    } else {
      throw new Error(`Unsupported key length: ${bits}`);
    }
  } else {
    throw new Error('Unsupported signature algorithm');
  }
}

function getRegisterNameFromPassportData(passportData: IDDocument) {
  if (passportData.documentCategory === 'aadhaar') {
    return 'register_aadhaar';
  }
  if (isKycDocument(passportData)) {
    return 'register_kyc';
  }
  if (!passportData.passportMetadata) {
    throw new Error('Passport data are not parsed');
  }
  const passportMetadata = passportData.passportMetadata;
  if (!passportMetadata.cscaFound) {
    throw new Error('CSCA not found');
  }
  const dgHashAlgo = passportMetadata.dg1HashFunction;
  const eContentHashAlgo = passportMetadata.eContentHashFunction;
  const signedAttrHashAlgo = passportMetadata.signedAttrHashFunction;
  const sigAlg = passportMetadata.signatureAlgorithm;
  const prefix =
    passportData.documentType === 'id_card' || passportData.documentType === 'mock_id_card'
      ? 'register_id'
      : 'register';
  if (sigAlg === 'ecdsa') {
    const { curveOrExponent } = passportMetadata;
    return `${prefix}_${dgHashAlgo}_${eContentHashAlgo}_${signedAttrHashAlgo}_${sigAlg}_${curveOrExponent}`;
  } else if (sigAlg === 'rsa') {
    const { curveOrExponent, signatureAlgorithmBits } = passportMetadata;
    if (signatureAlgorithmBits <= 4096) {
      return `${prefix}_${dgHashAlgo}_${eContentHashAlgo}_${signedAttrHashAlgo}_${sigAlg}_${curveOrExponent}_${4096}`;
    } else {
      throw new Error(`Unsupported key length: ${signatureAlgorithmBits}`);
    }
  } else if (sigAlg === 'rsapss') {
    const { curveOrExponent, saltLength, signatureAlgorithmBits } = passportMetadata;
    if (signatureAlgorithmBits <= 4096) {
      return `${prefix}_${dgHashAlgo}_${eContentHashAlgo}_${signedAttrHashAlgo}_${sigAlg}_${curveOrExponent}_${saltLength}_${signatureAlgorithmBits}`;
    } else {
      throw new Error(`Unsupported key length: ${signatureAlgorithmBits}`);
    }
  } else {
    throw new Error('Unsupported signature algorithm');
  }
}
