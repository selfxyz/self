import * as forge from 'node-forge';
import {
  splitToWords,
  hexToDecimal,
  bytesToBigDecimal,
  getNAndK,
} from '../../../common/src/utils/utils';
import { SignatureAlgorithm } from '../../../common/src/utils/types';

export const generateMockRsaPssInputs = (signatureAlgorithm: SignatureAlgorithm) => {
  let saltLength: number;

  const [sigAlg, hashAlgorithm, exponent, modulusLength] = signatureAlgorithm.split('_');

  switch (signatureAlgorithm) {
    case 'rsapss_sha256_65537_4096':
      saltLength = 32;
      break;
    case 'rsapss_sha256_65537_3072':
      saltLength = 32;
      break;
    case 'rsapss_sha256_65537_2048':
      saltLength = 32;
      break;
    case 'rsapss_sha256_3_4096':
      saltLength = 32;
      break;
    case 'rsapss_sha256_3_3072':
      saltLength = 32;
      break;
    case 'rsapss_sha256_3_2048':
      saltLength = 32;
      break;
    case 'rsapss_sha512_3_4096':
      saltLength = 64;
      break;
    case 'rsapss_sha512_3_2048':
      saltLength = 64;
      break;
    case 'rsapss_sha384_65537_4096':
      saltLength = 48;
      break;
    case 'rsapss_sha384_65537_3072':
      saltLength = 48;
      break;
    case 'rsapss_sha384_3_4096':
      saltLength = 48;
      break;
    case 'rsapss_sha384_3_3072':
      saltLength = 48;
      break;

    default:
      throw new Error(`Unsupported signature algorithm: ${signatureAlgorithm}`);
  }

  // Generate RSA key pair
  const keypair = forge.pki.rsa.generateKeyPair({
    bits: parseInt(modulusLength),
    e: parseInt(exponent),
  });
  const message = 'helloworld';

  // Create message hash
  const md = forge.md[hashAlgorithm].create();
  md.update(forge.util.binary.raw.encode(Buffer.from(message)));
  const messageHash = md.digest().bytes();
  const messageBits = Array.from(messageHash)
    .map((char: string) => {
      const byte = char.charCodeAt(0);
      return Array.from({ length: 8 }, (_, i) => (byte >> (7 - i)) & 1);
    })
    .flat();

  // Create PSS signature
  const pss = forge.pss.create({
    md: forge.md[hashAlgorithm].create(),
    mgf: forge.mgf.mgf1.create(forge.md[hashAlgorithm].create()),
    saltLength,
  });
  const signatureBytes = keypair.privateKey.sign(md, pss);
  const signature = Array.from(signatureBytes, (c: string) => c.charCodeAt(0));

  // Get modulus from public key
  const modulus = keypair.publicKey.n.toString(16);

  const { n, k } = getNAndK(signatureAlgorithm);

  return {
    signature: splitToWords(BigInt(bytesToBigDecimal(signature)), n, k),
    modulus: splitToWords(BigInt(hexToDecimal(modulus)), n, k),
    message: messageBits,
    saltLength: saltLength,
  };
};
