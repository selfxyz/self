import { PassportData } from './types';
import {
  hash,
  assembleEContent,
  formatAndConcatenateDataHashes,
  formatMrz,
} from './utils';
import * as forge from 'node-forge';
import * as asn1 from 'asn1js';
import elliptic from 'elliptic';
import {
  mock_dsc_key_sha1_rsa_4096,
  mock_dsc_key_sha256_ecdsa,
  mock_dsc_key_sha256_rsa_4096,
  mock_dsc_key_sha256_rsapss_2048,
  mock_dsc_key_sha256_rsapss_4096,
  mock_dsc_sha1_rsa_4096,
  mock_dsc_sha256_ecdsa,
  mock_dsc_sha256_rsa_4096,
  mock_dsc_sha256_rsapss_2048,
  mock_dsc_sha256_rsapss_4096,
  mock_dsc_key_sha1_ecdsa,
  mock_dsc_sha1_ecdsa,
  mock_dsc_key_sha384_ecdsa,
  mock_dsc_sha384_ecdsa,
  mock_dsc_key_sha256_brainpoolP256r1,
  mock_dsc_sha256_brainpoolP256r1,
} from '../constants/mockCertificates';
import { sampleDataHashes_small, sampleDataHashes_large } from '../constants/sampleDataHashes';
import { countryCodes } from '../constants/constants';
import { parseCertificate } from './certificates/handleCertificate';

export function genMockPassportData(
  signatureType: 'rsa_sha1' | 'rsa_sha256' | 'rsapss_sha256' | 'ecdsa_sha256' | 'ecdsa_sha1' | 'ecdsa_sha384' | 'brainpoolP256r1_sha256',
  nationality: keyof typeof countryCodes,
  birthDate: string,
  expiryDate: string,
  passportNumber: string = "15AA81234",
  lastName: string = "DUPONT",
  firstName: string = "ALPHONSE HUGHUES ALBERT"
): PassportData {
  if (birthDate.length !== 6 || expiryDate.length !== 6) {
    throw new Error('birthdate and expiry date have to be in the "YYMMDD" format');
  }

  // Prepare last name: Convert to uppercase, remove invalid characters, split by spaces, and join with '<'
  const lastNameParts = lastName.toUpperCase().replace(/[^A-Z< ]/g, '').split(' ');
  const formattedLastName = lastNameParts.join('<');

  // Prepare first name: Convert to uppercase, remove invalid characters, split by spaces, and join with '<'
  const firstNameParts = firstName.toUpperCase().replace(/[^A-Z< ]/g, '').split(' ');
  const formattedFirstName = firstNameParts.join('<');

  // Build the first line of MRZ
  let mrzLine1 = `P<${nationality}${formattedLastName}<<${formattedFirstName}`;

  // Pad the first line with '<' to make it exactly 44 characters
  mrzLine1 = mrzLine1.padEnd(44, '<');

  if (mrzLine1.length > 44) {
    throw new Error('First line of MRZ exceeds 44 characters');
  }

  // Build the second line of MRZ
  const mrzLine2 = `${passportNumber}4${nationality}${birthDate}1M${expiryDate}5<<<<<<<<<<<<<<02`;

  // Combine both lines to form the MRZ
  const mrz = mrzLine1 + mrzLine2;

  // Validate the MRZ length
  if (mrz.length !== 88) {
    throw new Error(`MRZ must be 88 characters long, got ${mrz.length}`);
  }

  let privateKeyPem: string;
  let dsc: string;
  let sampleDataHashes: [number, number[]][];

  switch (signatureType) {
    case 'rsa_sha1':
      sampleDataHashes = sampleDataHashes_small;
      privateKeyPem = mock_dsc_key_sha1_rsa_4096;
      dsc = mock_dsc_sha1_rsa_4096;
      break;
    case 'rsa_sha256':
      sampleDataHashes = sampleDataHashes_large;
      privateKeyPem = mock_dsc_key_sha256_rsa_4096;
      dsc = mock_dsc_sha256_rsa_4096;
      break;
    case 'rsapss_sha256':
      sampleDataHashes = sampleDataHashes_large;
      privateKeyPem = mock_dsc_key_sha256_rsapss_4096;
      dsc = mock_dsc_sha256_rsapss_4096;
      break;
    case 'ecdsa_sha256':
      sampleDataHashes = sampleDataHashes_large;
      privateKeyPem = mock_dsc_key_sha256_ecdsa;
      dsc = mock_dsc_sha256_ecdsa;
      break;
    case 'ecdsa_sha1':
      sampleDataHashes = sampleDataHashes_small;
      privateKeyPem = mock_dsc_key_sha1_ecdsa;
      dsc = mock_dsc_sha1_ecdsa;
      break;
    case 'ecdsa_sha384':
      sampleDataHashes = sampleDataHashes_small;
      privateKeyPem = mock_dsc_key_sha384_ecdsa;
      dsc = mock_dsc_sha384_ecdsa;
      break;
    case 'brainpoolP256r1_sha256':
      sampleDataHashes = sampleDataHashes_small;
      privateKeyPem = mock_dsc_key_sha256_brainpoolP256r1;
      dsc = mock_dsc_sha256_brainpoolP256r1;
      break;
  }

  const { hashFunction, hashLen } = parseCertificate(dsc);

  const mrzHash = hash(hashFunction, formatMrz(mrz));
  const concatenatedDataHashes = formatAndConcatenateDataHashes(
    [[1, mrzHash], ...sampleDataHashes],
    hashLen,
    30
  );

  const eContent = assembleEContent(hash(hashFunction, concatenatedDataHashes));

  const signature = sign(privateKeyPem, dsc, eContent);
  const signatureBytes = Array.from(signature, (byte) => (byte < 128 ? byte : byte - 256));

  return {
    dsc: dsc,
    mrz: mrz,
    dg2Hash: sampleDataHashes[0][1],
    eContent: concatenatedDataHashes,
    signedAttr: eContent,
    encryptedDigest: signatureBytes,
    photoBase64: 'iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAABjElEQVR42mL8//8/AyUYiBQYmIy3...',
    mockUser: true,
  };
}

function sign(
  privateKeyPem: string,
  dsc: string,
  eContent: number[]
): number[] {
  const { signatureAlgorithm, hashFunction, curve } = parseCertificate(dsc);

  if (signatureAlgorithm === 'rsapss') {
    const privateKey = forge.pki.privateKeyFromPem(privateKeyPem);
    const md = forge.md.sha256.create();
    md.update(forge.util.binary.raw.encode(new Uint8Array(eContent)));
    const pss = forge.pss.create({
      md: forge.md.sha256.create(),
      mgf: forge.mgf.mgf1.create(forge.md.sha256.create()),
      saltLength: 32,
    });
    const signatureBytes = privateKey.sign(md, pss);
    return Array.from(signatureBytes, (c: string) => c.charCodeAt(0));
  } else if (signatureAlgorithm === 'ecdsa') {
    const curveForElliptic = curve === 'secp256r1' ? 'p256' : 'p384';
    const ec = new elliptic.ec(curveForElliptic);

    const privateKeyDer = Buffer.from(
      privateKeyPem.replace(/-----BEGIN EC PRIVATE KEY-----|\n|-----END EC PRIVATE KEY-----/g, ''),
      'base64'
    );
    const asn1Data = asn1.fromBER(privateKeyDer);
    const privateKeyBuffer = (asn1Data.result.valueBlock as any).value[1].valueBlock.valueHexView;

    const keyPair = ec.keyFromPrivate(privateKeyBuffer);

    const md = hashFunction === 'sha1' ? forge.md.sha1.create() : forge.md.sha256.create();
    md.update(forge.util.binary.raw.encode(new Uint8Array(eContent)));
    const signature = keyPair.sign(md.digest().toHex(), 'hex');
    const signatureBytes = Array.from(Buffer.from(signature.toDER(), 'hex'));

    return signatureBytes;
  } else {
    const privKey = forge.pki.privateKeyFromPem(privateKeyPem);
    const md = hashFunction === 'sha1' ? forge.md.sha1.create() : forge.md.sha256.create();
    md.update(forge.util.binary.raw.encode(new Uint8Array(eContent)));
    const forgeSignature = privKey.sign(md);
    return Array.from(forgeSignature, (c: string) => c.charCodeAt(0));
  }
}
