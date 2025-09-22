import * as mockCertificates from '../../constants/mockCertificates.js';
import type { SignatureAlgorithm } from '../types.js';

function getMockDSC(signatureType: SignatureAlgorithm) {
  let privateKeyPem: string;
  let dsc: string;
  switch (signatureType) {
    case 'rsa_sha1_65537_2048':
      privateKeyPem = mockCertificates.mock_dsc_sha1_rsa_65537_2048_key;
      dsc = mockCertificates.mock_dsc_sha1_rsa_65537_2048;
      break;
    case 'rsa_sha1_65537_4096':
      privateKeyPem = mockCertificates.mock_dsc_sha1_rsa_65537_4096_key;
      dsc = mockCertificates.mock_dsc_sha1_rsa_65537_4096;
      break;
    case 'rsa_sha256_65537_2048':
      privateKeyPem = mockCertificates.mock_dsc_sha256_rsa_65537_2048_key;
      dsc = mockCertificates.mock_dsc_sha256_rsa_65537_2048;
      break;
    case 'rsapss_sha256_65537_2048':
      privateKeyPem = mockCertificates.mock_dsc_sha256_rsapss_32_65537_2048_key;
      dsc = mockCertificates.mock_dsc_sha256_rsapss_32_65537_2048;
      break;
    case 'rsapss_sha256_65537_2048_64':
      privateKeyPem = mockCertificates.mock_dsc_sha256_rsapss_64_65537_2048_key;
      dsc = mockCertificates.mock_dsc_sha256_rsapss_64_65537_2048;
      break;
    case 'rsapss_sha256_3_2048':
      privateKeyPem = mockCertificates.mock_dsc_sha256_rsapss_32_3_2048_key;
      dsc = mockCertificates.mock_dsc_sha256_rsapss_32_3_2048;
      break;
    case 'rsapss_sha256_3_3072':
      privateKeyPem = mockCertificates.mock_dsc_sha256_rsapss_32_3_3072_key;
      dsc = mockCertificates.mock_dsc_sha256_rsapss_32_3_3072;
      break;
    case 'rsapss_sha384_65537_3072':
      privateKeyPem = mockCertificates.mock_dsc_sha384_rsapss_48_65537_3072_key;
      dsc = mockCertificates.mock_dsc_sha384_rsapss_48_65537_3072;
      break;
    case 'rsapss_sha384_65537_2048':
      privateKeyPem = mockCertificates.mock_dsc_sha384_rsapss_48_65537_2048_key;
      dsc = mockCertificates.mock_dsc_sha384_rsapss_48_65537_2048;
      break;
    case 'ecdsa_sha256_secp256r1_256':
      privateKeyPem = mockCertificates.mock_dsc_sha256_ecdsa_secp256r1_key;
      dsc = mockCertificates.mock_dsc_sha256_ecdsa_secp256r1;
      break;
    case 'ecdsa_sha1_secp256r1_256':
      privateKeyPem = mockCertificates.mock_dsc_sha1_ecdsa_secp256r1_key;
      dsc = mockCertificates.mock_dsc_sha1_ecdsa_secp256r1;
      break;
    case 'ecdsa_sha384_secp384r1_384':
      privateKeyPem = mockCertificates.mock_dsc_sha384_ecdsa_secp384r1_key;
      dsc = mockCertificates.mock_dsc_sha384_ecdsa_secp384r1;
      break;
    case 'ecdsa_sha256_secp384r1_384':
      privateKeyPem = mockCertificates.mock_dsc_sha256_ecdsa_secp384r1_key;
      dsc = mockCertificates.mock_dsc_sha256_ecdsa_secp384r1;
      break;
    case 'ecdsa_sha1_brainpoolP256r1_256':
      privateKeyPem = mockCertificates.mock_dsc_sha1_ecdsa_brainpoolP256r1_key;
      dsc = mockCertificates.mock_dsc_sha1_ecdsa_brainpoolP256r1;
      break;
    case 'ecdsa_sha256_brainpoolP256r1_256':
      privateKeyPem = mockCertificates.mock_dsc_sha256_ecdsa_brainpoolP256r1_key;
      dsc = mockCertificates.mock_dsc_sha256_ecdsa_brainpoolP256r1;
      break;
    case 'ecdsa_sha384_brainpoolP256r1_256':
      privateKeyPem = mockCertificates.mock_dsc_sha384_ecdsa_brainpoolP256r1_key;
      dsc = mockCertificates.mock_dsc_sha384_ecdsa_brainpoolP256r1;
      break;
    case 'ecdsa_sha512_brainpoolP256r1_256':
      privateKeyPem = mockCertificates.mock_dsc_sha512_ecdsa_brainpoolP256r1_key;
      dsc = mockCertificates.mock_dsc_sha512_ecdsa_brainpoolP256r1;
      break;
    case 'rsa_sha256_3_2048':
      privateKeyPem = mockCertificates.mock_dsc_sha256_rsa_3_2048_key;
      dsc = mockCertificates.mock_dsc_sha256_rsa_3_2048;
      break;
    case 'rsa_sha256_65537_3072':
      privateKeyPem = mockCertificates.mock_dsc_sha256_rsa_65537_3072_key;
      dsc = mockCertificates.mock_dsc_sha256_rsa_65537_3072;
      break;
    case 'rsapss_sha256_65537_3072':
      privateKeyPem = mockCertificates.mock_dsc_sha256_rsapss_32_65537_3072_key;
      dsc = mockCertificates.mock_dsc_sha256_rsapss_32_65537_3072;
      break;
    case 'rsapss_sha256_65537_4096':
      privateKeyPem = mockCertificates.mock_dsc_sha256_rsapss_32_65537_4096_key;
      dsc = mockCertificates.mock_dsc_sha256_rsapss_32_65537_4096;
      break;
    case 'ecdsa_sha256_brainpoolP384r1_384':
      privateKeyPem = mockCertificates.mock_dsc_sha256_ecdsa_brainpoolP384r1_key;
      dsc = mockCertificates.mock_dsc_sha256_ecdsa_brainpoolP384r1;
      break;
    case 'ecdsa_sha384_brainpoolP384r1_384':
      privateKeyPem = mockCertificates.mock_dsc_sha384_ecdsa_brainpoolP384r1_key;
      dsc = mockCertificates.mock_dsc_sha384_ecdsa_brainpoolP384r1;
      break;
    case 'ecdsa_sha512_brainpoolP384r1_384':
      privateKeyPem = mockCertificates.mock_dsc_sha512_ecdsa_brainpoolP384r1_key;
      dsc = mockCertificates.mock_dsc_sha512_ecdsa_brainpoolP384r1;
      break;
    case 'ecdsa_sha1_brainpoolP224r1_224':
      privateKeyPem = mockCertificates.mock_dsc_sha1_ecdsa_brainpoolP224r1_key;
      dsc = mockCertificates.mock_dsc_sha1_ecdsa_brainpoolP224r1;
      break;
    case 'ecdsa_sha224_brainpoolP224r1_224':
      privateKeyPem = mockCertificates.mock_dsc_sha224_ecdsa_brainpoolP224r1_key;
      dsc = mockCertificates.mock_dsc_sha224_ecdsa_brainpoolP224r1;
      break;
    case 'ecdsa_sha256_brainpoolP224r1_224':
      privateKeyPem = mockCertificates.mock_dsc_sha256_ecdsa_brainpoolP224r1_key;
      dsc = mockCertificates.mock_dsc_sha256_ecdsa_brainpoolP224r1;
      break;
    case 'ecdsa_sha384_brainpoolP512r1_512':
      privateKeyPem = mockCertificates.mock_dsc_sha384_ecdsa_brainpoolP512r1_key;
      dsc = mockCertificates.mock_dsc_sha384_ecdsa_brainpoolP512r1;
      break;
    case 'ecdsa_sha512_brainpoolP512r1_512':
      privateKeyPem = mockCertificates.mock_dsc_sha512_ecdsa_brainpoolP512r1_key;
      dsc = mockCertificates.mock_dsc_sha512_ecdsa_brainpoolP512r1;
      break;
    case 'ecdsa_sha512_secp521r1_521':
      privateKeyPem = mockCertificates.mock_dsc_sha512_ecdsa_secp521r1_key;
      dsc = mockCertificates.mock_dsc_sha512_ecdsa_secp521r1;
      break;
    case 'ecdsa_sha256_secp521r1_521':
      privateKeyPem = mockCertificates.mock_dsc_sha256_ecdsa_secp521r1_key;
      dsc = mockCertificates.mock_dsc_sha256_ecdsa_secp521r1;
      break;
    case 'rsa_sha256_65537_4096':
      privateKeyPem = mockCertificates.mock_dsc_sha256_rsa_65537_4096_key;
      dsc = mockCertificates.mock_dsc_sha256_rsa_65537_4096;
      break;
    case 'rsa_sha512_65537_4096':
      privateKeyPem = mockCertificates.mock_dsc_sha512_rsa_65537_4096_key;
      dsc = mockCertificates.mock_dsc_sha512_rsa_65537_4096;
      break;
    case 'rsa_sha512_65537_2048':
      privateKeyPem = mockCertificates.mock_dsc_sha512_rsa_65537_2048_key;
      dsc = mockCertificates.mock_dsc_sha512_rsa_65537_2048;
      break;
    case 'rsa_sha256_3_4096':
      privateKeyPem = mockCertificates.mock_dsc_sha256_rsa_3_4096_key;
      dsc = mockCertificates.mock_dsc_sha256_rsa_3_4096;
      break;
    case 'rsa_sha384_65537_4096':
      privateKeyPem = mockCertificates.mock_dsc_sha384_rsa_65537_4096_key;
      dsc = mockCertificates.mock_dsc_sha384_rsa_65537_4096;
      break;
    case 'rsapss_sha512_65537_4096':
      privateKeyPem = mockCertificates.mock_dsc_sha512_rsapss_64_65537_4096_key;
      dsc = mockCertificates.mock_dsc_sha512_rsapss_64_65537_4096;
      break;
    case 'rsapss_sha512_65537_2048':
      privateKeyPem = mockCertificates.mock_dsc_sha512_rsapss_64_65537_2048_key;
      dsc = mockCertificates.mock_dsc_sha512_rsapss_64_65537_2048;
      break;
    case 'ecdsa_sha224_secp224r1_224':
      privateKeyPem = mockCertificates.mock_dsc_sha224_ecdsa_secp224r1_key;
      dsc = mockCertificates.mock_dsc_sha224_ecdsa_secp224r1;
      break;
    case 'rsapss_sha256_65537_4096_32':
      privateKeyPem = mockCertificates.mock_dsc_sha256_rsapss_32_65537_4096_key;
      dsc = mockCertificates.mock_dsc_sha256_rsapss_32_65537_4096;
      break;
    case 'rsapss_sha256_65537_2048_32':
      privateKeyPem = mockCertificates.mock_dsc_sha256_rsapss_32_65537_2048_key;
      dsc = mockCertificates.mock_dsc_sha256_rsapss_32_65537_2048;
      break;
    case 'rsa_sha1_64321_4096':
      privateKeyPem = mockCertificates.mock_dsc_sha1_rsa_64321_4096_key;
      dsc = mockCertificates.mock_dsc_sha1_rsa_64321_4096;
      break;
    case 'rsa_sha256_130689_4096':
      privateKeyPem = mockCertificates.mock_dsc_sha256_rsa_130689_4096_key;
      dsc = mockCertificates.mock_dsc_sha256_rsa_130689_4096;
      break;
    case 'rsa_sha256_122125_4096':
      privateKeyPem = mockCertificates.mock_dsc_sha256_rsa_122125_4096_key;
      dsc = mockCertificates.mock_dsc_sha256_rsa_122125_4096;
      break;
    case 'rsa_sha256_107903_4096':
      privateKeyPem = mockCertificates.mock_dsc_sha256_rsa_107903_4096_key;
      dsc = mockCertificates.mock_dsc_sha256_rsa_107903_4096;
      break;
    case 'rsa_sha256_56611_4096':
      privateKeyPem = mockCertificates.mock_dsc_sha256_rsa_56611_4096_key;
      dsc = mockCertificates.mock_dsc_sha256_rsa_56611_4096;
      break;
    default:
      throw new Error(`Unsupported signature type: ${signatureType}`);
  }
  return { privateKeyPem, dsc };
}

export { getMockDSC };
