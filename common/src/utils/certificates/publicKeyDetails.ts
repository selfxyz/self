import { fromBER, BitString } from 'asn1js';
import * as asn1 from 'asn1js';
import * as forge from 'node-forge';
import {
  PublicKeyDetailsECDSA,
  PublicKeyDetailsRSA,
  PublicKeyDetailsRSAPSS,
} from './dataStructure';
import {
  identifyCurve,
  StandardCurve,
  getNamedCurve,
  getECDSACurveBits,
  getCurveForElliptic,
} from './curves';
import { gethashFunctionName } from './handleCertificate';
import elliptic from 'elliptic';

const curves = elliptic.curves;
const PresetCurve = elliptic.curves.PresetCurve;

function defineCurve(name, options) {
  Object.defineProperty(curves, name, {
    configurable: true,
    enumerable: true,
    get: function () {
      var curve = new PresetCurve(options);
      Object.defineProperty(curves, name, {
        configurable: true,
        enumerable: true,
        value: curve,
      });
      return curve;
    },
  });
}

defineCurve('brainpoolP256r1', {
  type: 'short',
  prime: null,
  p: 'a9fb57db a1eea9bc 3e660a90 9d838d72 6e3bf623 d5262028 2013481d 1f6e5377',
  a: '7d5a0975 fc2c3057 eef67530 417affe7 fb8055c1 26dc5c6c e94a4b44 f330b5d9',
  b: '26dc5c6c e94a4b44 f330b5d9 bbd77cbf 95841629 5cf7e1ce 6bccdc18 ff8c07b6',
  n: 'a9fb57db a1eea9bc 3e660a90 9d838d71 8c397aa3 b561a6f7 901e0e82 974856a7',
  hash: curves.p256.hash,
  gRed: false,
  g: [
    '8bd2aeb9 cb7e57cb 2c4b482f fc81b7af b9de27e1 e3bd23c2 3a4453bd 9ace3262',
    '547ef835 c3dac4fd 97f8461a 14611dc9 c2774513 2ded8e54 5c1d54c7 2f046997',
  ],
});

defineCurve('brainpoolP384r1', {
  type: 'short',
  prime: null,
  p: '8cb91e82 a3386d28 0f5d6f7e 50e641df 152f7109 ed5456b4 12b1da19 7fb71123 acd3a729 901d1a71 87470013 3107ec53',
  a: '7bc382c6 3d8c150c 3c72080a ce05afa0 c2bea28e 4fb22787 139165ef ba91f90f 8aa5814a 503ad4eb 04a8c7dd 22ce2826',
  b: '04a8c7dd 22ce2826 8b39b554 16f0447c 2fb77de1 07dcd2a6 2e880ea5 3eeb62d5 7cb43902 95dbc994 3ab78696 fa504c11',
  n: '8cb91e82 a3386d28 0f5d6f7e 50e641df 152f7109 ed5456b3 1f166e6c ac0425a7 cf3ab6af 6b7fc310 3b883202 e9046565',
  hash: curves.p384.hash,
  gRed: false,
  g: [
    '1d1c64f0 68cf45ff a2a63a81 b7c13f6b 8847a3e7 7ef14fe3 db7fcafe 0cbd10e8 e826e034 36d646aa ef87b2e2 47d4af1e',
    '8abe1d75 20f9c2a4 5cb1eb8e 95cfd552 62b70b29 feec5864 e19c054f f9912928 0e464621 77918111 42820341 263c5315',
  ],
});

export function parseRsaPublicKey(subjectPublicKeyInfo: any): PublicKeyDetailsRSA {
  const publicKey = subjectPublicKeyInfo.subjectPublicKey;
  const asn1PublicKey = fromBER(publicKey.valueBlock.valueHexView);
  const rsaPublicKey = asn1PublicKey.result.valueBlock;

  if (
    rsaPublicKey &&
    (rsaPublicKey as any).value &&
    (rsaPublicKey as any).value[0] &&
    (rsaPublicKey as any).value[1]
  ) {
    const modulusAsn1 = (rsaPublicKey as any).value[0];
    const exponentAsn1 = (rsaPublicKey as any).value[1];
    const modulusHex = Buffer.from(modulusAsn1.valueBlock.valueHexView).toString('hex');
    const exponentHex = Buffer.from(exponentAsn1.valueBlock.valueHexView).toString('hex');

    const publicKeyForge = forge.pki.rsa.setPublicKey(
      new forge.jsbn.BigInteger(modulusHex, 16),
      new forge.jsbn.BigInteger(exponentHex, 16)
    );
    const publicKeyDetailsRSA: PublicKeyDetailsRSA = {
      modulus: publicKeyForge.n.toString(16),
      exponent: publicKeyForge.e.toString(10),
      bits: publicKeyForge.n.bitLength().toString(),
    };
    return publicKeyDetailsRSA;
  } else {
    return null;
  }
}

export function parseECParameters(publicKeyInfo: any): PublicKeyDetailsECDSA {
  try {
    const algorithmParams = publicKeyInfo.algorithm.algorithmParams;
    if (!algorithmParams) {
      console.error('\x1b[31mNo algorithm params found\x1b[0m');
      return null;
    }
    // get x and y;
    const curveOid = asn1.fromBER(algorithmParams.valueBeforeDecode).result.valueBlock.toString();
    const curve = getNamedCurve(curveOid);

    const publicKeyBuffer = publicKeyInfo.subjectPublicKey.valueBlock.valueHexView;
    const curveForElliptic = getCurveForElliptic(curve);
    const ec = new elliptic.ec(curveForElliptic);
    const key = ec.keyFromPublic(publicKeyBuffer);
    const x = key.getPublic().getX().toString('hex');
    const y = key.getPublic().getY().toString('hex');
    const fieldSizeMap: { [key: string]: number } = {
      secp256r1: 256,
      secp384r1: 384,
      brainpoolP256r1: 256,
      brainpoolP384r1: 384,
    };
    const bits = fieldSizeMap[curve];

    const params = asn1.fromBER(algorithmParams.valueBeforeDecodeView).result;
    const valueBlock: any = params.valueBlock;
    let curveParams: StandardCurve = {} as StandardCurve;

    // if (valueBlock.value && valueBlock.value.length >= 6) {
    //     // Field ID (index 1)
    //     const curveParams = {} as StandardCurve;
    //     const fieldId = valueBlock.value[1];
    //     if (fieldId && fieldId.valueBlock && fieldId.valueBlock.value) {
    //         const fieldType = fieldId.valueBlock.value[0];
    //         const prime = fieldId.valueBlock.value[1];
    //         //curveParams.fieldType = fieldType.valueBlock.toString();
    //         curveParams.p = Buffer.from(prime.valueBlock.valueHexView).toString('hex');
    //     }

    //     // Curve Coefficients (index 2)
    //     const curveCoefficients = valueBlock.value[2];
    //     if (curveCoefficients && curveCoefficients.valueBlock && curveCoefficients.valueBlock.value) {
    //         const a = curveCoefficients.valueBlock.value[0];
    //         const b = curveCoefficients.valueBlock.value[1];
    //         curveParams.a = Buffer.from(a.valueBlock.valueHexView).toString('hex');
    //         curveParams.b = Buffer.from(b.valueBlock.valueHexView).toString('hex');
    //     }

    //     // Base Point G (index 3)
    //     const basePoint = valueBlock.value[3];
    //     if (basePoint && basePoint.valueBlock) {
    //         curveParams.G = Buffer.from(basePoint.valueBlock.valueHexView).toString('hex');
    //     }

    //     // Order n (index 4)
    //     const order = valueBlock.value[4];
    //     if (order && order.valueBlock) {
    //         curveParams.n = Buffer.from(order.valueBlock.valueHexView).toString('hex');
    //     }

    //     // Cofactor h (index 5)
    //     const cofactor = valueBlock.value[5];
    //     if (cofactor && cofactor.valueBlock) {
    //         curveParams.h = Buffer.from(cofactor.valueBlock.valueHexView).toString('hex');
    //     }
    //     if (curveParams.p && curveParams.a && curveParams.b && curveParams.G && curveParams.n && curveParams.h) {
    //         const identifiedCurve = identifyCurve(curveParams);
    //     }
    // } else {
    //     if (valueBlock.value) {

    //         if (algorithmParams.idBlock.tagNumber === 6) {
    //             console.log('\x1b[33malgorithmParams.idBlock.tagNumber === 6, looking for algorithmParams.valueBlock\x1b[0m');

    //             const curveOid = algorithmParams.valueBlock.toString();
    //             const curveName = getNamedCurve(curveOid);
    //             // console.error('\x1b[33mCurve OID:', curveName, '\x1b[0m');
    //             return { curve: curveName, params: {} as StandardCurve, bits: getECDSACurveBits(curveName) };
    //         }
    //         else {
    //             console.log('\x1b[31malgorithmParams.idBlock.tagNumber !== 6\x1b[0m');
    //         }
    //     }
    //     else {
    //         console.log('\x1b[31mvalue block is not defined\x1b[0m');
    //     }
    // }
    const publicKeyDetailsECDSA: PublicKeyDetailsECDSA = {
      curve: curve,
      params: curveParams,
      bits: bits.toString(),
      x: x,
      y: y,
    };
    return publicKeyDetailsECDSA;
  } catch (error) {
    console.error('Error parsing EC parameters:', error);
  }
}

export function parseRsaPssParams(params: any): {
  hashFunction: string;
  mgf: string;
  saltLength: string;
} {
  try {
    const algorithmParams = asn1.fromBER(params.valueBeforeDecodeView);
    const sequence = algorithmParams.result;

    let hashFunction = 'Unknown';
    let mgf = 'Unknown';
    let saltLength = 'Unknown';

    // Parse hash algorithm
    if ((sequence.valueBlock as any).value && (sequence.valueBlock as any).value[0]) {
      const hashFunctionSequence = (sequence.valueBlock as any).value[0].valueBlock.value[0];
      const hashFunctionOid = hashFunctionSequence.valueBlock.value[0].valueBlock.toString();
      hashFunction = gethashFunctionName(hashFunctionOid);
    }

    // Parse MGF
    if ((sequence.valueBlock as any).value && (sequence.valueBlock as any).value[1]) {
      const mgfSequence = (sequence.valueBlock as any).value[1].valueBlock.value[0];
      const mgfOid = mgfSequence.valueBlock.value[0].valueBlock.toString();
      mgf = mgfOid === '1.2.840.113549.1.1.8' ? 'MGF1' : `Unknown (${mgfOid})`;
    }
    // console.log((sequence.valueBlock as any).value[0].valueBlock);
    // console.log((sequence.valueBlock as any).value[1].valueBlock);
    // console.log((sequence.valueBlock as any).value[2].valueBlock);

    // Parse salt length
    if ((sequence.valueBlock as any).value && (sequence.valueBlock as any).value[2]) {
      const saltLengthContainer = (sequence.valueBlock as any).value[2];

      if (saltLengthContainer.valueBlock && saltLengthContainer.valueBlock.value) {
        const rawSaltLength = saltLengthContainer.valueBlock.value[0];
        if (typeof rawSaltLength === 'number') {
          saltLength = rawSaltLength.toString();
        } else if (
          rawSaltLength &&
          rawSaltLength.valueBlock &&
          rawSaltLength.valueBlock.valueHexView
        ) {
          const saltLengthValue = rawSaltLength.valueBlock.valueHexView[0];
          saltLength = saltLengthValue.toString();
        } else {
          console.error('\x1b[31mUnable to parse salt length\x1b[0m');
        }
      } else {
        console.log('\x1b[31mSalt length not found\x1b[0m');
      }
    }

    return { hashFunction, mgf, saltLength };
  } catch (error) {
    console.error('Error parsing RSA-PSS parameters:', error);
    return { hashFunction: 'Unknown', mgf: 'Unknown', saltLength: 'Unknown' };
  }
}

export function parseRsaPssPublicKey(
  subjectPublicKeyInfo: any,
  rsaPssParams: any
): PublicKeyDetailsRSAPSS {
  let hashFunction = 'Unknown';
  let mgf = 'Unknown';
  let saltLength = 'Unknown';

  if (rsaPssParams) {
    const parsedParams = parseRsaPssParams(rsaPssParams);
    hashFunction = parsedParams.hashFunction;
    mgf = parsedParams.mgf;
    saltLength = parsedParams.saltLength;
  } else {
    console.log('\x1b[31mRSA-PSS parameters not found\x1b[0m');
  }

  // Add PublicKeyDetails for RSA-PSS
  const publicKey = subjectPublicKeyInfo.subjectPublicKey;
  const asn1PublicKey = fromBER(publicKey.valueBlock.valueHexView);
  const rsaPublicKey = asn1PublicKey.result.valueBlock;

  if (
    rsaPublicKey &&
    (rsaPublicKey as any).value &&
    (rsaPublicKey as any).value[0] &&
    (rsaPublicKey as any).value[1]
  ) {
    const modulusAsn1 = (rsaPublicKey as any).value[0];
    const exponentAsn1 = (rsaPublicKey as any).value[1];
    const modulusHex = Buffer.from(modulusAsn1.valueBlock.valueHexView).toString('hex');
    const exponentHex = Buffer.from(exponentAsn1.valueBlock.valueHexView).toString('hex');

    const publicKeyForge = forge.pki.rsa.setPublicKey(
      new forge.jsbn.BigInteger(modulusHex, 16),
      new forge.jsbn.BigInteger(exponentHex, 16)
    );
    const PublicKeyDetailsRSAPSS: PublicKeyDetailsRSAPSS = {
      modulus: publicKeyForge.n.toString(16),
      exponent: publicKeyForge.e.toString(10),
      bits: publicKeyForge.n.bitLength().toString(),
      hashFunction,
      mgf,
      saltLength,
    };
    return PublicKeyDetailsRSAPSS;
  } else {
    return null;
  }
}
