import { X509Certificate } from '@peculiar/x509';
import { decode } from '@stablelib/cbor';
//@ts-ignore
import * as asn1 from 'asn1.js';
import { Buffer } from 'buffer';

import { getCurveForElliptic } from '../../../../common/src/utils/certificate_parsing/curves';
import { PublicKeyDetailsECDSA } from '../../../../common/src/utils/certificate_parsing/dataStructure';
import { parseCertificateSimple } from '../../../../common/src/utils/certificate_parsing/parseCertificateSimple';
import { AWS_ROOT_PEM } from './awsRootPem';
import cose from './cose';

// The required fields for a valid attestation
export const requiredFields = [
  'module_id',
  'digest',
  'timestamp',
  'pcrs',
  'certificate',
  'cabundle',
];

// Define an interface for the ASN.1 context used with asn1.js
interface ASN1Context {
  seq(): ASN1Context;
  obj(...args: any[]): ASN1Context;
  key(name: string): ASN1Context;
  objid(): ASN1Context;
  bitstr(): ASN1Context;
}

// Update the ASN.1 definition with proper typing for ECPublicKey
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

// Utility function to check if a number is within (start, end] range
export const numberInRange = (
  start: number,
  end: number,
  value: number,
): boolean => {
  return value > start && value <= end;
};

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

  //for each key, value in pcts
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

  if (!verifyCertChain(AWS_ROOT_PEM, [...certChain, cert])) {
    throw new Error('Invalid certificate chain');
  }

  const parsed = parseCertificateSimple(cert);
  const publicKeyDetails = parsed.publicKeyDetails as PublicKeyDetailsECDSA;

  const curve = getCurveForElliptic(publicKeyDetails.curve);

  const x = publicKeyDetails.x;
  const y = publicKeyDetails.y;

  const verifier = {
    key: {
      x,
      y,
      curve,
    },
  };
  await cose.sign.verify(Buffer.from(attestation), verifier, {
    defaultType: 18,
  });
  return true;
};

export function getPublicKey(attestation: Array<number>) {
  const coseSign1 = decode(Buffer.from(attestation));
  const [_protectedHeaderBytes, _unprotectedHeader, payload, _signature] =
    coseSign1;
  const attestationDoc = decode(payload) as AttestationDoc;
  return attestationDoc.public_key;
}

// Update the type definition to match the actual data structure
type AttestationDoc = {
  module_id: string;
  digest: string;
  timestamp: number;
  pcrs: { [key: number]: Buffer }; // Changed from Map to object
  certificate: Buffer;
  cabundle: Array<Buffer>;
  public_key: string | null;
  user_data: string | null;
  nonce: string | null;
};

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
