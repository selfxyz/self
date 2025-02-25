import { PassportData } from '../types';

export function getCircuitNameFromPassportData(passportData: PassportData, circuitType: 'register' | 'dsc') {
  if (circuitType === 'register') {
    return getRegisterNameFromPassportData(passportData);
  } else {
    return getDSCircuitNameFromPassportData(passportData);
  }
}

function getDSCircuitNameFromPassportData(passportData: PassportData) {
  console.log('Getting DSC circuit name from passport data...');

  if (!passportData.passportMetadata) {
    console.error('Passport metadata is missing');
    throw new Error("Passport data are not parsed");
  }
  const passportMetadata = passportData.passportMetadata;
  
  if (!passportMetadata.cscaFound) {
    console.error('CSCA not found in passport metadata');
    throw new Error("CSCA not found");
  }

  const signatureAlgorithm = passportMetadata.cscaSignatureAlgorithm;
  const hashFunction = passportMetadata.cscaHashFunction;

  console.log('CSCA Signature Algorithm:', signatureAlgorithm);
  console.log('CSCA Hash Function:', hashFunction);

  if (signatureAlgorithm === 'ecdsa') {
    console.log('Processing ECDSA signature...');
    const curve = passportMetadata.cscaCurveOrExponent;
    console.log('ECDSA curve:', curve);
    const circuitName = `dsc_${hashFunction}_${signatureAlgorithm}_${curve}`;
    console.log('Generated circuit name:', circuitName);
    return circuitName;

  } else if (signatureAlgorithm === 'rsa') {
    console.log('Processing RSA signature...');
    const exponent = passportMetadata.cscaCurveOrExponent;
    const bits = passportMetadata.cscaSignatureAlgorithmBits;
    console.log('RSA exponent:', exponent);
    console.log('RSA bits:', bits);
    
    if (bits <= 4096) {
      const circuitName = `dsc_${hashFunction}_${signatureAlgorithm}_${exponent}_${4096}`;
      console.log('Generated circuit name:', circuitName);
      return circuitName;
    } else {
      console.error('RSA key length exceeds maximum supported length');
      throw new Error(`Unsupported key length: ${bits}`);
    }

  } else if (signatureAlgorithm === 'rsapss') {
    console.log('Processing RSA-PSS signature...');
    const exponent = passportMetadata.cscaCurveOrExponent;
    const saltLength = passportMetadata.cscaSaltLength;
    const bits = passportMetadata.cscaSignatureAlgorithmBits;
    console.log('RSA-PSS exponent:', exponent);
    console.log('RSA-PSS salt length:', saltLength);
    console.log('RSA-PSS bits:', bits);

    if (bits <= 4096) {
      const circuitName = `dsc_${hashFunction}_${signatureAlgorithm}_${exponent}_${saltLength}_${bits}`;
      console.log('Generated circuit name:', circuitName);
      return circuitName;
    } else {
      console.error('RSA-PSS key length exceeds maximum supported length');
      throw new Error(`Unsupported key length: ${bits}`);
    }
  } else {
    console.error('Unsupported signature algorithm:', signatureAlgorithm);
    throw new Error('Unsupported signature algorithm');
  }
}

function getRegisterNameFromPassportData(passportData: PassportData) {
  console.log('Getting register circuit name from passport data...');

  if (!passportData.passportMetadata) {
    console.error('Passport metadata is missing');
    throw new Error("Passport data are not parsed");
  }
  const passportMetadata = passportData.passportMetadata;

  if (!passportMetadata.cscaFound) {
    console.error('CSCA not found in passport metadata');
    throw new Error("CSCA not found");
  }

  const parsedDsc = passportData.dsc_parsed;

  const dgHashAlgo = passportMetadata.dg1HashFunction;
  const eContentHashAlgo = passportMetadata.eContentHashFunction;
  const signedAttrHashAlgo = passportMetadata.signedAttrHashFunction;
  const sigAlg = passportMetadata.signatureAlgorithm;

  console.log('DG Hash Algorithm:', dgHashAlgo);
  console.log('eContent Hash Algorithm:', eContentHashAlgo);
  console.log('Signed Attributes Hash Algorithm:', signedAttrHashAlgo);
  console.log('Signature Algorithm:', sigAlg);

  if (parsedDsc.signatureAlgorithm === 'ecdsa') {
    console.log('Processing ECDSA signature...');
    const {
      curveOrExponent,
    } = passportMetadata
    console.log('ECDSA curve:', curveOrExponent);
    const circuitName = `register_${dgHashAlgo}_${eContentHashAlgo}_${signedAttrHashAlgo}_${sigAlg}_${curveOrExponent}`;
    console.log('Generated circuit name:', circuitName);
    return circuitName;

  } else if (parsedDsc.signatureAlgorithm === 'rsa') {
    console.log('Processing RSA signature...');
    const {
      curveOrExponent,
      signatureAlgorithmBits
    } = passportMetadata
    console.log('RSA exponent:', curveOrExponent);
    console.log('RSA bits:', signatureAlgorithmBits);

    if (signatureAlgorithmBits <= 4096) {
      const circuitName = `register_${dgHashAlgo}_${eContentHashAlgo}_${signedAttrHashAlgo}_${sigAlg}_${curveOrExponent}_${4096}`;
      console.log('Generated circuit name:', circuitName);
      return circuitName;
    } else {
      console.error('RSA key length exceeds maximum supported length');
      throw new Error(`Unsupported key length: ${signatureAlgorithmBits}`);
    }

  } else if (parsedDsc.signatureAlgorithm === 'rsapss') {
    console.log('Processing RSA-PSS signature...');
    const {
      curveOrExponent,
      saltLength,
      signatureAlgorithmBits
    } = passportMetadata
    console.log('RSA-PSS exponent:', curveOrExponent);
    console.log('RSA-PSS salt length:', saltLength);
    console.log('RSA-PSS bits:', signatureAlgorithmBits);

    if (signatureAlgorithmBits <= 4096) {
      const circuitName = `register_${dgHashAlgo}_${eContentHashAlgo}_${signedAttrHashAlgo}_${sigAlg}_${curveOrExponent}_${saltLength}_${signatureAlgorithmBits}`;
      console.log('Generated circuit name:', circuitName);
      return circuitName;
    } else {
      console.error('RSA-PSS key length exceeds maximum supported length');
      throw new Error(`Unsupported key length: ${signatureAlgorithmBits}`);
    }
  } else {
    console.error('Unsupported signature algorithm:', parsedDsc.signatureAlgorithm);
    throw new Error('Unsupported signature algorithm');
  }
}