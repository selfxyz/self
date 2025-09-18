// generate a mock id document

import * as asn1 from 'asn1js';
import elliptic from 'elliptic';
import forge from 'node-forge';

import type { hashAlgosTypes } from '../../constants/constants.js';
import { API_URL_STAGING } from '../../constants/constants.js';
import { countries } from '../../constants/countries.js';
import { convertByteArrayToBigInt, processQRData } from '../aadhaar/mockData.js';
import { extractQRDataFields } from '../aadhaar/utils.js';
import { getCurveForElliptic } from '../certificate_parsing/curves.js';
import type {
  PublicKeyDetailsECDSA,
  PublicKeyDetailsRSAPSS,
} from '../certificate_parsing/dataStructure.js';
import { parseCertificateSimple } from '../certificate_parsing/parseCertificateSimple.js';
import { getHashLen, hash } from '../hash.js';
import type {
  AadhaarData,
  DocumentType,
  PassportData,
  SignatureAlgorithm,
} from '../types.js';
import { genDG1 } from './dg1.js';
import { formatAndConcatenateDataHashes, formatMrz, generateSignedAttr } from './format.js';
import { getMockDSC } from './getMockDSC.js';
import { initPassportDataParsing } from './passport.js';

export interface IdDocInput {
  idType: 'mock_passport' | 'mock_id_card' | 'mock_aadhaar';
  dgHashAlgo?: hashAlgosTypes;
  eContentHashAlgo?: hashAlgosTypes;
  signatureType?: SignatureAlgorithm;
  nationality?: (typeof countries)[keyof typeof countries];
  birthDate?: string;
  expiryDate?: string;
  passportNumber?: string;
  lastName?: string;
  firstName?: string;
  sex?: 'M' | 'F';
  // Aadhaar-specific fields
  pincode?: string; // - not disclosing this so not getting it in CreateMockScreen
  state?: string;
}

const defaultIdDocInput: IdDocInput = {
  idType: 'mock_passport',
  dgHashAlgo: 'sha256',
  eContentHashAlgo: 'sha256',
  signatureType: 'rsa_sha256_65537_2048',
  nationality: countries.UNITED_STATES,
  birthDate: '900101',
  expiryDate: '300101',
  passportNumber: '123456789',
  lastName: undefined,
  firstName: undefined,
  sex: 'M',
  // Aadhaar defaults
  pincode: '110051',
  state: 'Delhi',
};

// Hardcoded Aadhaar test certificates. TODO Move it to correct place.
const AADHAAR_MOCK_PRIVATE_KEY_PEM = `-----BEGIN PRIVATE KEY-----
MIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC//2Yjq4TpEm1t
5Fm4MM/+8MhGPd9vTAZpo04L7HYFbe4YdFmXZBLXH6KbLrbK3uhMuq9dmotJiDtx
Wjch5f5iHwqLLUKsSHJl4Mr2eFZj77TTLkxTEUYEISpRm9JSIHYRg7kcFPbR+CrE
uAe9s3/qLDAD85gqDCiosj6bCovMLayHQYglqN2pbYNp8ZIFaVj1gdkoQg8wCK5O
D3jy5CJnvJirNuiWrvdRLZ48o01L7b/2B/iuBWtoBtOaCTPWZutBIcKB6oNUKBbY
zwG40NxWpQtAeY6NW0CC/apqUEZVPLdYijjsLGBUohHTtLCXB/C1KDNh0sNTfMU8
bkctLqvXAgMBAAECggEAD3zqgBS6F1RRhOyUR9VfZskepsfr9ve/ieFodNhhpuUS
Y8efyIrqmCiPPr+npp+q4DGsRTunyJbXdx8YO0EcSOcIvAE6xr7ekS68JxWLBoT6
MpG8CqfMkAQeFh1trte7UbgtN3SbeoTV6/uNqE7LRUuRbgHGM+VTzFP6OxomyW5/
BGHmhlU5j5r4gdNrztwpnfLFZvZt+4yR99kWIoYbFAvgq6sgRGflo45dHGG80TUd
o3vir1IeNAY5vkeJ9owCxUJW4JxJKarjlBibqRUprEgnjKr2ovxirjUOzOClmVEJ
tgyx4doY/F9cE8jD4JfcC7xxC79j90odfEED+5IBKQKBgQD2nCwPxr9YxMiQLQii
Z4E7x96nHdTvqXKSTPGWX2Zv6Sur9qL1Wyz30tt3COB7+b9UwtpTozDxxlVn+u4U
SnDdVWMrUpDi03dRvsLWhTDC8btN6WnYqGmHKSjst+yHytPo39cqQVZ4TY8Gqfg0
3/Pqb5hpxkJ2RRxVt3gDvgnOPwKBgQDHTuSxZbpQ956z8t6BA4tDYkFC9BFQpb/F
pSrw2w8PMZH4QckbjFj59ME2u/WLyuJ+U8GjR4YTk8ZXQ5niSrPDC5Pa6s3Ano44
8h5FgrMeAbxZ0HuANHRS1YWba8k4tbeunAdj08nIviMJEuhMcjzbqgf5rFrrGzR5
Jb86eznsaQKBgBzMLeUFu3B9QkJ7z8dPOOsnMtvnAuedrPBipc9+gnLNErl5CpyG
MiEacWBcHAK+LlaSjnY3105Ub8K9rbGW48kk4Hi9ooeqVAOquAve78vD+LBncmHH
gNM0vj+uVqOgztAh23lmuddAj1Qi4wYhpNUahPzNFxPCjEWCMDSXq4N3AoGAcqR1
tXi/WA1m8zkzNWCVfXgJ8/ox74K3sXdVIN/QZLvtq7Ajfr4W/AgGD3bEQdm8uE9z
JXlhrOcmglF3NYwkpH+HV7gSC8boJedW9EK+xvbWoY7jSxZhBridNo4kW4NjGYPU
WF6dRePggTqn9jkLuoquNbYnQe8PGtRUj84LvmkCgYEA5iu39qcCBd+JuPDmxOJx
Ah3QcOFI4i7WW9oi7+68aCqee9K7d659hyYWpewYcDXzvSLYvXJJcU9vkVuW8DLK
lQzKVNh2/5SaAN/EysYBpFQVbNZ5dA74WrjxnPsNmwRc6yv/o8I/LfgWOB9yB3fI
avCtlYniKHPvSCA/gS2h4fk=
-----END PRIVATE KEY-----
`;

// TODO: Move it to correct place.
const AADHAAR_MOCK_PUBLIC_KEY_PEM = `-----BEGIN CERTIFICATE-----
MIIDjzCCAnegAwIBAgIUZA6u4qBxEjW4dxmbLaLkWnHIybowDQYJKoZIhvcNAQEL
BQAwVzELMAkGA1UEBhMCVVMxDjAMBgNVBAgMBVN0YXRlMQ0wCwYDVQQHDARDaXR5
MRUwEwYDVQQKDAxPcmdhbml6YXRpb24xEjAQBgNVBAMMCWxvY2FsaG9zdDAeFw0y
NTA5MTgxMDE2NTlaFw0yNjA5MTgxMDE2NTlaMFcxCzAJBgNVBAYTAlVTMQ4wDAYD
VQQIDAVTdGF0ZTENMAsGA1UEBwwEQ2l0eTEVMBMGA1UECgwMT3JnYW5pemF0aW9u
MRIwEAYDVQQDDAlsb2NhbGhvc3QwggEiMA0GCSqGSIb3DQEBAQUAA4IBDwAwggEK
AoIBAQC//2Yjq4TpEm1t5Fm4MM/+8MhGPd9vTAZpo04L7HYFbe4YdFmXZBLXH6Kb
LrbK3uhMuq9dmotJiDtxWjch5f5iHwqLLUKsSHJl4Mr2eFZj77TTLkxTEUYEISpR
m9JSIHYRg7kcFPbR+CrEuAe9s3/qLDAD85gqDCiosj6bCovMLayHQYglqN2pbYNp
8ZIFaVj1gdkoQg8wCK5OD3jy5CJnvJirNuiWrvdRLZ48o01L7b/2B/iuBWtoBtOa
CTPWZutBIcKB6oNUKBbYzwG40NxWpQtAeY6NW0CC/apqUEZVPLdYijjsLGBUohHT
tLCXB/C1KDNh0sNTfMU8bkctLqvXAgMBAAGjUzBRMB0GA1UdDgQWBBTGyVMLFNL2
PRJwtA8vekrtJVu2BTAfBgNVHSMEGDAWgBTGyVMLFNL2PRJwtA8vekrtJVu2BTAP
BgNVHRMBAf8EBTADAQH/MA0GCSqGSIb3DQEBCwUAA4IBAQCwcKlyaZw3jxDNtU6j
V8g9tUr77z0LyTrVe0GujxFaa4EKKKqG/lzf6wNDaHGOgyEwhPsi/ui8VU6Y8KTS
SxorUta+2zNHu8jziz1rxYTfgPWvK54B3Q3q4ycRLmYfR0CVvH2+TvTAqfEEvpEh
8tY9mpNzjYsLzlwPszkWU+WpLJjH0VPhVIiFC65EaxuArZrap8IpuK/bSa4Beqbb
7rMo/KmDfhFpVMQcOrvyQJmurtmjo12Esb0EjwZp634nDVRC9gFXEh5YuWBg3IaI
cTCvHQ+MAXTzZMOfc2dWZYdk1PaO6xLTw0YfGAtl6r3x4Csd0i5iwpDo1JXjSpZE
mESQ
-----END CERTIFICATE-----
`;

// Generate mock Aadhaar document
function genMockAadhaarDoc(input: IdDocInput): AadhaarData {
  const name = input.firstName
    ? `${input.firstName} ${input.lastName || ''}`.trim()
    : generateRandomName();

  const gender = input.sex === 'F' ? 'F' : 'M';
  const pincode = input.pincode ?? '110051';
  const state = input.state ?? 'Delhi';
  const dateOfBirth = input.birthDate ?? '01-01-1990';
  console.log('genMockAadhaarDoc', input);
  console.log('dateOfBirth', dateOfBirth);

  // Generate Aadhaar QR data using processQRData
  const qrData = processQRData(
    AADHAAR_MOCK_PRIVATE_KEY_PEM,
    name,
    dateOfBirth,
    gender,
    pincode,
    state,
    new Date().getTime().toString()
  );

  // Convert QR data to string format
  const qrDataString = convertByteArrayToBigInt(qrData.qrDataBytes).toString();

  // Extract signature from the decoded data
  const signatureBytes = qrData.decodedData.slice(
    qrData.decodedData.length - 256,
    qrData.decodedData.length
  );
  const signature = Array.from(signatureBytes);

  console.log('qrData.extractedFields', qrData.extractedFields);

  return {
    documentType: input.idType as DocumentType,
    documentCategory: 'aadhaar',
    mock: true,
    qrData: qrDataString,
    extractedFields: qrData.extractedFields,
    signature,
    publicKey: AADHAAR_MOCK_PUBLIC_KEY_PEM,
    photoHash: qrData.photoHash.toString(),
  };
}

export function genMockIdDoc(
  userInput: Partial<IdDocInput> = {},
  mockDSC?: { dsc: string; privateKeyPem: string }
): PassportData | AadhaarData {

  if (userInput.idType === 'mock_aadhaar') {
    return genMockAadhaarDoc(userInput as IdDocInput);
  }

  const mergedInput: IdDocInput = {
    ...defaultIdDocInput,
    ...userInput,
  };

  mergedInput.lastName = mergedInput.lastName ?? 'DOE';
  mergedInput.firstName = mergedInput.firstName ?? 'JOHN';

  let privateKeyPem: string, dsc: string;
  if (mockDSC) {
    dsc = mockDSC.dsc;
    privateKeyPem = mockDSC.privateKeyPem;
  } else {
    ({ privateKeyPem, dsc } = getMockDSC(mergedInput.signatureType));
  }

  const dg1 = genDG1(mergedInput);
  const dg1_hash = hash(mergedInput.dgHashAlgo, formatMrz(dg1));
  const dataGroupHashes = generateDataGroupHashes(
    dg1_hash as number[],
    getHashLen(mergedInput.dgHashAlgo)
  );
  const eContent = formatAndConcatenateDataHashes(dataGroupHashes, 63);
  const eContentHash = hash(mergedInput.eContentHashAlgo, eContent);
  const signedAttr = generateSignedAttr(eContentHash as number[]);
  const hashAlgo = mergedInput.signatureType.split('_')[1];
  const signature = sign(privateKeyPem, dsc, hashAlgo, signedAttr);
  const signatureBytes = Array.from(signature, (byte) => (byte < 128 ? byte : byte - 256));
  return {
    dsc: dsc,
    mrz: dg1,
    dg2Hash: dataGroupHashes.find(([dgNum]) => dgNum === 2)?.[1] || [],
    eContent: eContent,
    signedAttr: signedAttr,
    encryptedDigest: signatureBytes,
    documentType: mergedInput.idType as DocumentType,
    documentCategory: mergedInput.idType === 'mock_passport' ? 'passport' : 'id_card',
    mock: true,
  };
}

export function genMockIdDocAndInitDataParsing(userInput: Partial<IdDocInput> = {}) {
  return initPassportDataParsing({
    ...genMockIdDoc(userInput) as PassportData,
  });
}

export async function generateMockDSC(
  signatureType: string
): Promise<{ privateKeyPem: string; dsc: string }> {
  const response = await fetch(`${API_URL_STAGING}/generate-dsc`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ signatureType }),
  });
  if (!response.ok) {
    throw new Error(`Failed to generate DSC: ${response.status} ${response.statusText}`);
  }
  const data = await response.json();
  if (!data || !data.data) {
    throw new Error('Missing data in server response');
  }
  if (typeof data.data.privateKeyPem !== 'string' || typeof data.data.dsc !== 'string') {
    throw new Error('Invalid DSC response format from server');
  }
  return { privateKeyPem: data.data.privateKeyPem, dsc: data.data.dsc };
}

function generateRandomName(): string {
  // Generate random letter combinations for first and last name
  const generateRandomLetters = (length: number): string => {
    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    return Array.from({ length }, () => letters[Math.floor(Math.random() * letters.length)]).join('');
  };

  const firstName = generateRandomLetters(4 + Math.floor(Math.random() * 4)); // 4-7 letters
  const lastName = generateRandomLetters(5 + Math.floor(Math.random() * 5)); // 5-9 letters

  return `${firstName} ${lastName}`;
}

function generateRandomBytes(length: number): number[] {
  // Generate numbers between -128 and 127 to match the existing signed byte format
  return Array.from({ length }, () => Math.floor(Math.random() * 256) - 128);
}

function generateDataGroupHashes(mrzHash: number[], hashLen: number): [number, number[]][] {
  // Generate hashes for DGs 2-15 (excluding some DGs that aren't typically used)
  const dataGroups: [number, number[]][] = [
    [1, mrzHash], // DG1 must be the MRZ hash
    [2, generateRandomBytes(hashLen)],
    [3, generateRandomBytes(hashLen)],
    [4, generateRandomBytes(hashLen)],
    [5, generateRandomBytes(hashLen)],
    [7, generateRandomBytes(hashLen)],
    [8, generateRandomBytes(hashLen)],
    // [11, generateRandomBytes(hashLen)],
    // [12, generateRandomBytes(hashLen)],
    // [14, generateRandomBytes(hashLen)],
    [15, generateRandomBytes(hashLen)],
  ];

  return dataGroups;
}
function sign(
  privateKeyPem: string,
  dsc: string,
  hashAlgorithm: string,
  eContent: number[]
): number[] {
  const { signatureAlgorithm, publicKeyDetails } = parseCertificateSimple(dsc);

  if (signatureAlgorithm === 'rsapss') {
    const privateKey = forge.pki.privateKeyFromPem(privateKeyPem);
    const md = forge.md[hashAlgorithm].create();
    md.update(forge.util.binary.raw.encode(new Uint8Array(eContent)));
    const pss = forge.pss.create({
      md: forge.md[hashAlgorithm].create(),
      mgf: forge.mgf.mgf1.create(forge.md[hashAlgorithm].create()),
      saltLength: parseInt((publicKeyDetails as PublicKeyDetailsRSAPSS).saltLength),
    });
    const signatureBytes = privateKey.sign(md, pss);
    return Array.from(signatureBytes, (c: string) => c.charCodeAt(0));
  } else if (signatureAlgorithm === 'ecdsa') {
    const curve = (publicKeyDetails as PublicKeyDetailsECDSA).curve;
    const curveForElliptic = getCurveForElliptic(curve);
    const ec = new elliptic.ec(curveForElliptic);

    const privateKeyDer = Buffer.from(
      privateKeyPem.replace(/-----BEGIN EC PRIVATE KEY-----|\n|-----END EC PRIVATE KEY-----/g, ''),
      'base64'
    );
    const asn1Data = asn1.fromBER(privateKeyDer);
    const privateKeyBuffer = (asn1Data.result.valueBlock as any).value[1].valueBlock.valueHexView;

    const keyPair = ec.keyFromPrivate(privateKeyBuffer);
    const msgHash = hash(hashAlgorithm, eContent, 'hex');

    const signature = keyPair.sign(msgHash, 'hex');
    // @ts-ignore-error toDer gives number[] what is fine for Buffer.from
    const signatureBytes = Array.from(Buffer.from(signature.toDER(), 'hex'));

    return signatureBytes;
  } else {
    const privKey = forge.pki.privateKeyFromPem(privateKeyPem);
    const md = forge.md[hashAlgorithm].create();
    md.update(forge.util.binary.raw.encode(new Uint8Array(eContent)));
    const forgeSignature = privKey.sign(md);
    return Array.from(forgeSignature, (c: string) => c.charCodeAt(0));
  }
}
