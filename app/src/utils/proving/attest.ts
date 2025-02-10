import { X509Certificate } from '@peculiar/x509';
import { decode } from '@stablelib/cbor';
//@ts-ignore
import * as asn1 from 'asn1.js';
import * as asn1js from 'asn1js';
import { Buffer } from 'buffer';
import elliptic from 'elliptic';
import { Certificate } from 'pkijs';

import { IMAGE_HASH } from '../../../../common/src/constants/constants';
import { AWS_ROOT_PEM } from './awsRootPem';
import cose from './cose';

/**
 * @notice An array specifying the required fields for a valid attestation.
 */
export const requiredFields = [
  'module_id',
  'digest',
  'timestamp',
  'pcrs',
  'certificate',
  'cabundle',
];

/**
 * @notice ASN.1 context interface for use with asn1js.js.
 */
interface ASN1Context {
  seq(): ASN1Context;
  obj(...args: any[]): ASN1Context;
  key(name: string): ASN1Context;
  objid(): ASN1Context;
  bitstr(): ASN1Context;
}

/**
 * @notice ASN.1 definition for an Elliptic Curve Public Key.
 */
export const ECPublicKeyASN = asn1.define(
  'ECPublicKey',
  function (this: ASN1Context) {
    this.seq().obj(
      this.key('algo')
        .seq()
        .obj(this.key('id').objid(), this.key('curve').objid()),
      this.key('pubKey').bitstr(),
    );
  },
);

/**
 * @notice Utility function to check if a number is within (start, end] range.
 * @param start The start of the range (exclusive).
 * @param end The end of the range (inclusive).
 * @param value The number to check.
 * @return True if value is within the range; otherwise, false.
 */
export const numberInRange = (
  start: number,
  end: number,
  value: number,
): boolean => {
  return value > start && value <= end;
};

/**
 * @notice Verifies a certificate chain against a provided trusted root certificate.
 * @param rootPem The trusted root certificate in PEM format.
 * @param certChainStr An array of certificates in PEM format, ordered from leaf to root.
 * @return True if the certificate chain is valid, false otherwise.
 */
export const verifyCertChain = (
  rootPem: string,
  certChainStr: string[],
): boolean => {
  try {
    // Parse all certificates
    const rootCert = new X509Certificate(rootPem);
    const certChain = certChainStr.map(cert => new X509Certificate(cert));

    // Verify the chain from leaf to root
    for (let i = 0; i < certChain.length; i++) {
      const currentCert = certChain[i];
      const issuerCert =
        i === certChain.length - 1 ? rootCert : certChain[i + 1];

      // Verify certificate validity period
      const now = new Date();
      if (now < currentCert.notBefore || now > currentCert.notAfter) {
        console.error('Certificate is not within its validity period');
        return false;
      }

      // Verify signature
      try {
        const isValid = currentCert.verify(issuerCert);
        if (!isValid) {
          console.error(`Certificate at index ${i} has invalid signature`);
          return false;
        }
      } catch (e) {
        console.error(`Error verifying signature at index ${i}:`, e);
        return false;
      }
    }
    console.log('Certificate chain verified');
    return true;
  } catch (error) {
    console.error('Certificate chain verification error:', error);
    return false;
  }
};

/**
 * @notice Verifies a TEE attestation document encoded as a COSE_Sign1 structure.
 * @param attestation An array of numbers representing the COSE_Sign1 encoded attestation document.
 * @return A promise that resolves to true if the attestation is verified successfully.
 * @throws Error if the attestation document is improperly formatted or missing required fields.
 */
export const verifyAttestation = async (attestation: Array<number>) => {
  const coseSign1 = await decode(Buffer.from(attestation));

  if (!Array.isArray(coseSign1) || coseSign1.length !== 4) {
    throw new Error('Invalid COSE_Sign1 format');
  }

  const [_protectedHeaderBytes, _unprotectedHeader, payload, _signature] =
    coseSign1;

  const attestationDoc = (await decode(payload)) as AttestationDoc;

  for (const field of requiredFields) {
    //@ts-ignore
    if (!attestationDoc[field]) {
      throw new Error(`Missing required field: ${field}`);
    }
  }

  if (!(attestationDoc.module_id.length > 0)) {
    throw new Error('Invalid module_id');
  }
  if (!(attestationDoc.digest === 'SHA384')) {
    throw new Error('Invalid digest');
  }

  if (!(attestationDoc.timestamp > 0)) {
    throw new Error('Invalid timestamp');
  }

  // for each key, value in pcrs
  for (const [key, value] of Object.entries(attestationDoc.pcrs)) {
    if (parseInt(key, 10) < 0 || parseInt(key, 10) >= 32) {
      throw new Error('Invalid pcr index');
    }

    if (![32, 48, 64].includes(value.length)) {
      throw new Error('Invalid pcr value length at: ' + key);
    }
  }

  if (!(attestationDoc.cabundle.length > 0)) {
    throw new Error('Invalid cabundle');
  }

  for (let i = 0; i < attestationDoc.cabundle.length; i++) {
    if (!numberInRange(0, 1024, attestationDoc.cabundle[i].length)) {
      throw new Error('Invalid cabundle');
    }
  }

  if (attestationDoc.public_key) {
    if (!numberInRange(0, 1024, attestationDoc.public_key.length)) {
      throw new Error('Invalid public_key');
    }
  }

  if (attestationDoc.user_data) {
    if (!numberInRange(-1, 512, attestationDoc.user_data.length)) {
      throw new Error('Invalid user_data');
    }
  }

  if (attestationDoc.nonce) {
    if (!numberInRange(-1, 512, attestationDoc.nonce.length)) {
      throw new Error('Invalid nonce');
    }
  }

  const certChain = attestationDoc.cabundle.map((cert: Buffer) =>
    derToPem(cert),
  );

  const cert = derToPem(attestationDoc.certificate);
  const imageHash = getImageHash(attestation);
  if (imageHash !== IMAGE_HASH) {
    throw new Error('Invalid image hash');
  }
  console.log('TEE image hash verified');

  if (!verifyCertChain(AWS_ROOT_PEM, [...certChain, cert])) {
    throw new Error('Invalid certificate chain');
  }

  const { x, y, curve } = getPublicKeyFromPem(cert);

  const verifier = {
    key: {
      x,
      y,
      curve,
    },
  };
  console.log('verifier', verifier);
  await cose.sign.verify(Buffer.from(attestation), verifier, {
    defaultType: 18,
  });
  return true;
};

/**
 * @notice Extracts the public key from a TEE attestation document.
 * @param attestation An array of numbers representing the COSE_Sign1 encoded attestation document.
 * @return The public key as a string.
 */
export function getPublicKey(attestation: Array<number>) {
  const coseSign1 = decode(Buffer.from(attestation));
  const [_protectedHeaderBytes, _unprotectedHeader, payload, _signature] =
    coseSign1;
  const attestationDoc = decode(payload) as AttestationDoc;
  return attestationDoc.public_key;
}

/**
 * @notice Converts a DER-encoded certificate to PEM format.
 * @param der A Buffer containing the DER-encoded certificate.
 * @return The PEM-formatted certificate string.
 * @throws Error if the conversion fails.
 */
export function derToPem(der: Buffer): string {
  try {
    const base64 = Buffer.from(der).toString('base64');
    return (
      '-----BEGIN CERTIFICATE-----\n' +
      base64.match(/.{1,64}/g)!.join('\n') +
      '\n-----END CERTIFICATE-----'
    );
  } catch (error) {
    console.error('DER to PEM conversion error:', error);
    throw error;
  }
}

/**
 * @notice Extracts the image hash (PCR0) from the attestation document.
 * @param attestation An array of numbers representing the COSE_Sign1 encoded attestation document.
 * @return The image hash (PCR0) as a hexadecimal string.
 * @throws Error if the COSE_Sign1 format is invalid or PCR0 is missing/incorrect.
 * @see https://docs.aws.amazon.com/enclaves/latest/user/set-up-attestation.html
 */
export function getImageHash(attestation: Array<number>) {
  const coseSign1 = decode(Buffer.from(attestation));

  if (!Array.isArray(coseSign1) || coseSign1.length !== 4) {
    throw new Error('Invalid COSE_Sign1 format');
  }
  const [_protectedHeaderBytes, _unprotectedHeader, payload, _signature] =
    coseSign1;
  const attestationDoc = decode(payload);
  if (!attestationDoc.pcrs) {
    throw new Error('Missing required field: pcrs');
  }
  const pcr0 = attestationDoc.pcrs[0];
  if (!pcr0) {
    throw new Error('PCR0 (image hash) is missing in the attestation document');
  }
  if (pcr0.length !== 48) {
    // SHA384 produces a 48-byte hash
    throw new Error(
      `Invalid PCR0 length - expected 48 bytes, got ${pcr0.length} bytes`,
    );
  }
  return Buffer.from(pcr0).toString('hex');
}

type AttestationDoc = {
  module_id: string;
  digest: string;
  timestamp: number;
  pcrs: { [key: number]: Buffer };
  certificate: Buffer;
  cabundle: Array<Buffer>;
  public_key: string | null;
  user_data: string | null;
  nonce: string | null;
};

/**
 * @notice Extracts the public key from a PEM formatted certificate.
 * @param pem A string containing the PEM formatted certificate.
 * @return An object with the x and y coordinates of the public key and the curve used.
 * @see https://docs.aws.amazon.com/enclaves/latest/user/set-up-attestation.html for p384 usage
 * @dev This function parses the certificate using getCertificateFromPem(), then uses the elliptic library
 *      on the "p384" curve to derive the public key's x and y coordinates. This public key is then returned,
 *      ensuring it is padded correctly.
 */
function getPublicKeyFromPem(pem: string) {
  const cert = getCertificateFromPem(pem);
  const curve = 'p384';
  const publicKeyBuffer =
    cert.subjectPublicKeyInfo.subjectPublicKey.valueBlock.valueHexView;
  const ec = new elliptic.ec(curve);
  const key = ec.keyFromPublic(publicKeyBuffer);
  const x_point = key.getPublic().getX().toString('hex');
  const y_point = key.getPublic().getY().toString('hex');

  const x = x_point.length % 2 === 0 ? x_point : '0' + x_point;
  const y = y_point.length % 2 === 0 ? y_point : '0' + y_point;
  return { x, y, curve };
}

/**
 * @notice Converts a PEM formatted certificate to a PKI.js Certificate object.
 * @param pemContent A string containing the PEM formatted certificate including header/footer markers.
 * @return A Certificate object parsed from the PEM content.
 * @dev The function strips the PEM header/footer and line breaks, decodes the base64 content into binary,
 *      creates an ArrayBuffer, and then parses the ASN.1 structure using asn1js.fromBER. Throws an error if parsing fails.
 */
export function getCertificateFromPem(pemContent: string): Certificate {
  const pemFormatted = pemContent.replace(
    /(-----(BEGIN|END) CERTIFICATE-----|\n|\r)/g,
    '',
  );
  const binary = Buffer.from(pemFormatted, 'base64');
  const arrayBuffer = new ArrayBuffer(binary.length);
  const view = new Uint8Array(arrayBuffer);
  for (let i = 0; i < binary.length; i++) {
    view[i] = binary[i];
  }

  const asn1Data = asn1js.fromBER(arrayBuffer);
  if (asn1.offset === -1) {
    throw new Error(`ASN.1 parsing error: ${asn1Data.result.error}`);
  }

  return new Certificate({ schema: asn1Data.result });
}
