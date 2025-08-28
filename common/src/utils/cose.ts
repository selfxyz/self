import { Buffer } from 'buffer';
import { ec as EC } from 'elliptic';
import { sha384 } from 'js-sha512';

import { decode, encode } from '@stablelib/cbor';

/**
 * @notice Verifies a COSE_Sign1 message signature against the provided ECDSA public key.
 * @param data A Buffer containing the COSE_Sign1 encoded message.
 * @param verifier An object providing the signature verification properties:
 *                 - key.x: The hexadecimal string for the x-coordinate of the public key.
 *                 - key.y: The hexadecimal string for the y-coordinate of the public key.
 *                 - key.curve: The elliptic curve identifier (e.g., 'p256', 'p384') to be used.
 * @param _options An object containing options for verification. Currently supports:
 *                 - defaultType: The expected type identifier (not actively used in the verification flow).
 * @return A Promise that resolves if the signature is valid; otherwise, it throws an error.
 * @notice This function is typically invoked by the attestation verification process in @attest.ts
 *         to ensure that the TEE's COSE_Sign1 attestation document has not been tampered with.
 * @see https://docs.aws.amazon.com/enclaves/latest/user/set-up-attestation.html for p384 sha384 usage
 */
const cose = {
  sign: {
    verify: async (
      data: Buffer,
      verifier: { key: { x: string; y: string; curve: string } },
      _options: { defaultType: number }
    ) => {
      const decoded = decode(new Uint8Array(data));
      if (!Array.isArray(decoded) || decoded.length !== 4) {
        throw new Error('Invalid COSE_Sign1 format');
      }
      const [protectedHeaderBytes, _unprotectedHeader, payload, signature] = decoded;
      const externalAAD = new Uint8Array(0); // external_aad is empty here
      const sigStructure = ['Signature1', protectedHeaderBytes, externalAAD, payload];
      const sigStructureEncoded = encode(sigStructure);
      const hash = sha384(sigStructureEncoded);
      const sigBuffer = Buffer.from(signature);
      if (sigBuffer.length % 2 !== 0) {
        throw new Error('Invalid signature length');
      }
      const halfLen = sigBuffer.length / 2;
      const r = Buffer.from(sigBuffer.subarray(0, halfLen));
      const s = Buffer.from(sigBuffer.subarray(halfLen));
      const rHex = r.toString('hex');
      const sHex = s.toString('hex');
      const ecInstance = new EC(verifier.key.curve);
      const key = ecInstance.keyFromPublic({ x: verifier.key.x, y: verifier.key.y }, 'hex');
      const valid = key.verify(hash, { r: rHex, s: sHex });
      if (!valid) {
        throw new Error('AWS root certificate signature verification failed');
      }
    },
  },
};

export default cose;

export const AWS_ROOT_PEM = `
-----BEGIN CERTIFICATE-----
MIICETCCAZagAwIBAgIRAPkxdWgbkK/hHUbMtOTn+FYwCgYIKoZIzj0EAwMwSTEL
MAkGA1UEBhMCVVMxDzANBgNVBAoMBkFtYXpvbjEMMAoGA1UECwwDQVdTMRswGQYD
VQQDDBJhd3Mubml0cm8tZW5jbGF2ZXMwHhcNMTkxMDI4MTMyODA1WhcNNDkxMDI4
MTQyODA1WjBJMQswCQYDVQQGEwJVUzEPMA0GA1UECgwGQW1hem9uMQwwCgYDVQQL
DANBV1MxGzAZBgNVBAMMEmF3cy5uaXRyby1lbmNsYXZlczB2MBAGByqGSM49AgEG
BSuBBAAiA2IABPwCVOumCMHzaHDimtqQvkY4MpJzbolL//Zy2YlES1BR5TSksfbb
48C8WBoyt7F2Bw7eEtaaP+ohG2bnUs990d0JX28TcPQXCEPZ3BABIeTPYwEoCWZE
h8l5YoQwTcU/9KNCMEAwDwYDVR0TAQH/BAUwAwEB/zAdBgNVHQ4EFgQUkCW1DdkF
R+eWw5b6cp3PmanfS5YwDgYDVR0PAQH/BAQDAgGGMAoGCCqGSM49BAMDA2kAMGYC
MQCjfy+Rocm9Xue4YnwWmNJVA44fA0P5W2OpYow9OYCVRaEevL8uO1XYru5xtMPW
rfMCMQCi85sWBbJwKKXdS6BptQFuZbT73o/gBh1qUxl/nNr12UO8Yfwr6wPLb+6N
IwLz3/Y=
-----END CERTIFICATE-----`;
