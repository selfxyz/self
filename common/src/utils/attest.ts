import { ethers } from 'ethers';
import forge from 'node-forge';

import { PCR0_MANAGER_ADDRESS, RPC_URL } from '../constants/constants.js';

const GCP_ROOT_CERT = `
-----BEGIN CERTIFICATE-----
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
uyT5CnJulxSC5CT1
-----END CERTIFICATE-----
`;

const PCR0ManagerABI = ['function isPCR0Set(bytes calldata pcr0) external view returns (bool)'];

function base64UrlDecodeToBytes(input: string): string {
  const base64 = input.replace(/-/g, '+').replace(/_/g, '/');
  const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
  return forge.util.decode64(padded);
}

function base64UrlDecodeToString(input: string): string {
  const base64 = input.replace(/-/g, '+').replace(/_/g, '/');
  const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
  return forge.util.decodeUtf8(forge.util.decode64(padded));
}

type PKICertificates = {
  leaf: forge.pki.Certificate;
  intermediate: forge.pki.Certificate;
  root: forge.pki.Certificate;
};

function extractCertificates(x5c: string[]): PKICertificates {
  const decode = (b64: string) =>
    forge.pki.certificateFromAsn1(forge.asn1.fromDer(forge.util.decode64(b64)));

  return {
    leaf: decode(x5c[0]),
    intermediate: decode(x5c[1]),
    root: decode(x5c[2]),
  };
}

function compareCertificates(cert1: forge.pki.Certificate, cert2: forge.pki.Certificate): boolean {
  const hash1 = forge.md.sha256
    .create()
    .update(forge.asn1.toDer(forge.pki.certificateToAsn1(cert1)).getBytes())
    .digest()
    .toHex();
  const hash2 = forge.md.sha256
    .create()
    .update(forge.asn1.toDer(forge.pki.certificateToAsn1(cert2)).getBytes())
    .digest()
    .toHex();
  return hash1 === hash2;
}

function verifyCertificateChain({ leaf, intermediate, root }: PKICertificates) {
  const caStore = forge.pki.createCaStore([root]);

  forge.pki.verifyCertificateChain(caStore, [leaf, intermediate, root], (vfd, depth) => {
    if (vfd !== true) {
      throw new Error(`Certificate verification failed at depth ${depth}`);
    }
    return true;
  });

  const now = new Date();
  if (now < root.validity.notBefore || now > root.validity.notAfter) {
    throw new Error('Certificate is not within validity period');
  }
}

/**
 * @notice Queries the PCR0Manager contract to verify that the PCR0 value extracted from the attestation
 *         is mapped to true.
 * @param attestation An array of numbers representing the COSE_Sign1 encoded attestation document.
 * @return A promise that resolves to true if the PCR0 value is set in the contract, or false otherwise.
 */
export async function checkPCR0Mapping(imageHashHex: string): Promise<boolean> {
  // The getImageHash function returns a hex string (without the "0x" prefix)
  // For a SHA384 hash, we expect 64 hex characters (32 bytes)
  if (imageHashHex.length !== 64) {
    throw new Error(
      `Invalid PCR0 hash length: expected 64 hex characters, got ${imageHashHex.length}`
    );
  }

  // Convert the PCR0 hash from hex to a byte array, ensuring proper "0x" prefix
  const pcr0Bytes = ethers.getBytes(`0x${imageHashHex.padStart(96, '0')}`);
  if (pcr0Bytes.length !== 48) {
    throw new Error(`Invalid PCR0 bytes length: expected 48, got ${pcr0Bytes.length}`);
  }

  const celoProvider = new ethers.JsonRpcProvider(RPC_URL);

  // Create a contract instance for the PCR0Manager
  const pcr0Manager = new ethers.Contract(PCR0_MANAGER_ADDRESS, PCR0ManagerABI, celoProvider);

  try {
    // Query the contract: isPCR0Set returns true if the given PCR0 value is set
    return await pcr0Manager.isPCR0Set(pcr0Bytes);
  } catch (error) {
    console.error('Error checking PCR0 mapping:', error);
    throw error;
  }
}

export function validatePKIToken(
  attestationToken: string,
  dev: boolean = true
): {
  userPubkey: Buffer;
  serverPubkey: Buffer;
  imageHash: string;
  verified: boolean;
} {
  // Decode JWT header
  const [encodedHeader, encodedPayload, encodedSignature] = attestationToken.split('.');
  const header = JSON.parse(forge.util.decodeUtf8(forge.util.decode64(encodedHeader)));
  if (header.alg !== 'RS256') throw new Error(`Invalid alg: ${header.alg}`);

  const x5c = header.x5c;
  if (!x5c || x5c.length !== 3) throw new Error('x5c header must contain exactly 3 certificates');
  const certificates = extractCertificates(x5c);
  const storedRootCert = forge.pki.certificateFromPem(GCP_ROOT_CERT);
  // Compare root certificate fingerprint
  if (!compareCertificates(storedRootCert, certificates.root)) {
    throw new Error('Root certificate does not match expected root');
  }
  verifyCertificateChain(certificates);
  // Verify JWT signature
  const pemPublicKey = forge.pki.publicKeyToPem(certificates.leaf.publicKey);
  try {
    const signingInput = `${encodedHeader}.${encodedPayload}`;

    // Decode signature (base64url → binary)
    const signatureBytes = base64UrlDecodeToBytes(encodedSignature); // string of binary bytes

    // Verify RS256 signature
    const md = forge.md.sha256.create();
    md.update(signingInput, 'utf8');
    const rsaPublicKey = certificates.leaf.publicKey as forge.pki.rsa.PublicKey; // cast to RSA type
    const verified = rsaPublicKey.verify(md.digest().bytes(), signatureBytes);
    if (!verified) throw new Error('Signature verification failed');

    const payloadStr = base64UrlDecodeToString(encodedPayload);
    const payload = JSON.parse(payloadStr);
    if (!dev) {
      if (payload.dbgstat !== 'disabled-since-boot') {
        throw new Error('Debug mode is enabled');
      }
    }
    return {
      verified: true,
      userPubkey: Buffer.from(payload.eat_nonce[0], 'base64'),
      serverPubkey: Buffer.from(payload.eat_nonce[1], 'base64'),
      //slice the sha256: prefix
      imageHash: payload.submods.container.image_digest.slice(7),
    };
  } catch (err) {
    console.error('TEE JWT signature verification failed:', err);
    return {
      verified: false,
      userPubkey: Buffer.from([]),
      serverPubkey: Buffer.from([]),
      imageHash: '',
    };
  }
}
