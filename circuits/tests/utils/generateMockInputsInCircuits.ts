import crypto from 'crypto';

import { SignatureAlgorithm } from '@selfxyz/common/utils/types';
import { hexToDecimal, splitToWords } from '@selfxyz/common/utils/bytes';
import { bytesToBigDecimal } from '@selfxyz/common/utils/bytes';
import { getNAndK } from '@selfxyz/common/utils/passports/passport';

export const generateMockRsaPkcs1v1_5Inputs = (signatureAlgorithm: SignatureAlgorithm) => {
  let privateKey: string;
  let publicKey: string;
  let signAlgorithm: string;
  let modulusLength: number;
  let publicExponent: number;

  switch (signatureAlgorithm) {
    case 'rsa_sha256_3_2048':
      modulusLength = 2048;
      signAlgorithm = 'sha256';
      publicExponent = 3;
      break;
    case 'rsa_sha1_65537_2048':
    case 'rsa_sha256_65537_2048':
    case 'rsa_sha256_65537_3072':
      modulusLength = signatureAlgorithm.includes('3072') ? 3072 : 2048;
      signAlgorithm = signatureAlgorithm.includes('sha1') ? 'sha1' : 'sha256';
      publicExponent = 65537;
      break;
    case 'rsa_sha256_65537_4096':
    case 'rsa_sha512_65537_4096':
      modulusLength = 4096;
      signAlgorithm = signatureAlgorithm.includes('sha256') ? 'sha256' : 'sha512';
      publicExponent = 65537;
      break;
    case 'rsa_sha224_65537_2048':
      modulusLength = 2048;
      signAlgorithm = 'sha224';
      publicExponent = 65537;
      break;
    case 'rsa_sha1_64321_4096':
      modulusLength = 4096;
      signAlgorithm = 'sha1';
      publicExponent = 64321;
      break;
    case 'rsa_sha256_130689_4096':
      modulusLength = 4096;
      signAlgorithm = 'sha256';
      publicExponent = 130689;
      break;
    case 'rsa_sha256_122125_4096':
      modulusLength = 4096;
      signAlgorithm = 'sha256';
      publicExponent = 122125;
      break;
    case 'rsa_sha256_107903_4096':
      modulusLength = 4096;
      signAlgorithm = 'sha256';
      publicExponent = 107903;
      break;
    case 'rsa_sha256_56611_4096':
      modulusLength = 4096;
      signAlgorithm = 'sha256';
      publicExponent = 56611;
      break;
    default:
      throw new Error(`Unsupported signature algorithm: ${signatureAlgorithm}`);
  }

  ({ privateKey, publicKey } = crypto.generateKeyPairSync('rsa', {
    modulusLength,
    publicExponent,
    publicKeyEncoding: {
      type: 'spki',
      format: 'pem',
    },
    privateKeyEncoding: {
      type: 'pkcs8',
      format: 'pem',
    },
  }));

  const message = Buffer.from('helloworld');
  const messageHash = crypto.createHash(signAlgorithm).update(message).digest();
  console.log('messageHash', messageHash.toString('hex'));

  const signature = crypto.sign(signAlgorithm, message, privateKey);

  const publicKeyObject = crypto.createPublicKey(publicKey);
  const keyDetails = publicKeyObject.export({ format: 'jwk' });
  const modulus = keyDetails.n!; // base64url encoded modulus

  const { n, k } = getNAndK(signatureAlgorithm);

  return {
    signature: splitToWords(BigInt(bytesToBigDecimal(Array.from(signature))), n, k),
    modulus: splitToWords(
      BigInt(hexToDecimal(Buffer.from(modulus, 'base64url').toString('hex'))),
      n,
      k
    ),
    message: splitToWords(BigInt(bytesToBigDecimal(Array.from(messageHash))), n, k),
  };
};
