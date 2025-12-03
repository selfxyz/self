/**
 * Prepares GCP JWT attestations with full certificate chain verification
 *
 * Extracts all 3 x5c certificates, their public keys, signatures, and generates
 * circuit inputs for complete chain-of-trust verification:
 * 1. JWT signature (signed by x5c[0])
 * 2. x5c[0] certificate signature (signed by x5c[1])
 * 3. x5c[1] certificate signature (signed by x5c[2])
 *
 * Usage: tsx prepare.ts <jwt_file.txt> [output_file.json]
 */

import * as fs from 'fs';
import * as forge from 'node-forge';
import { generateJWTVerifierInputs } from '@zk-email/jwt-tx-builder-helpers/src/input-generators.js';
import type { RSAPublicKey } from '@zk-email/jwt-tx-builder-helpers/src/types.js';

const MAX_CERT_LENGTH = 2048;
const MAX_EAT_NONCE_B64_LENGTH = 99; // Base64url string max length (74 bytes decoded = 99 b64url chars)
const MAX_IMAGE_DIGEST_LENGTH = 71; // "sha256:" + 64 hex chars

interface CertificateInfo {
  der: Buffer;
  derPadded: Buffer;
  paddedLength: number;
  publicKey: forge.pki.rsa.PublicKey;
  pubkeyOffset: number;
  pubkeyLength: number;
  signature: Buffer;
  cert: forge.pki.Certificate;
}

function parseCertificate(certDer: Buffer): CertificateInfo {
  const asn1Cert = forge.asn1.fromDer(forge.util.createBuffer(certDer.toString('binary')));
  const cert = forge.pki.certificateFromAsn1(asn1Cert);
  const publicKey = cert.publicKey as forge.pki.rsa.PublicKey;

  const signature = Buffer.from(cert.signature, 'binary');

  const tbsAsn1 = asn1Cert.value[0];
  if (typeof tbsAsn1 === 'string') {
    throw new Error('Expected ASN.1 object for TBS certificate, got string');
  }
  const tbsDer = forge.asn1.toDer(tbsAsn1);
  const tbsBytes = Buffer.from(tbsDer.getBytes(), 'binary');

  const tbsHex = tbsBytes.toString('hex');
  const pubkeyDer = Buffer.from(publicKey.n.toByteArray());
  const pubkeyHex = pubkeyDer.toString('hex');

  const rawOffset = tbsHex.indexOf(pubkeyHex);
  if (rawOffset === -1) {
    throw new Error('Could not find public key in TBS certificate DER encoding');
  }
  const pubkeyOffset = rawOffset / 2 + 1;

  const pubkeyLength = pubkeyDer.length > 256 ? pubkeyDer.length - 1 : pubkeyDer.length;

  // Validate TBS certificate size before padding
  if (tbsBytes.length > MAX_CERT_LENGTH) {
    throw new Error(
      `TBS certificate size ${tbsBytes.length} exceeds MAX_CERT_LENGTH ${MAX_CERT_LENGTH}`
    );
  }

  const paddedLength = Math.ceil((tbsBytes.length + 9) / 64) * 64;

  // Validate padded length doesn't exceed buffer bounds
  if (paddedLength > MAX_CERT_LENGTH) {
    throw new Error(
      `Padded TBS length ${paddedLength} exceeds MAX_CERT_LENGTH ${MAX_CERT_LENGTH}. ` +
        `TBS size was ${tbsBytes.length} bytes. Consider increasing MAX_CERT_LENGTH or using a smaller certificate.`
    );
  }

  const tbsPadded = Buffer.alloc(MAX_CERT_LENGTH);
  tbsBytes.copy(tbsPadded, 0);

  tbsPadded[tbsBytes.length] = 0x80;
  const lengthInBits = tbsBytes.length * 8;
  tbsPadded.writeBigUInt64BE(BigInt(lengthInBits), paddedLength - 8);

  console.log(`[INFO] Certificate: ${cert.subject.attributes[0]?.value || 'Unknown'}`);
  console.log(`  Full cert DER size: ${certDer.length} bytes`);
  console.log(`  TBS cert DER size: ${tbsBytes.length} bytes`);
  console.log(`  TBS padded length: ${paddedLength} bytes`);
  console.log(`  Public key offset (in TBS): ${pubkeyOffset}`);
  console.log(`  Public key length: ${pubkeyLength} bytes`);
  console.log(`  Signature length: ${signature.length} bytes`);

  return {
    der: tbsBytes,
    derPadded: tbsPadded,
    paddedLength,
    publicKey,
    pubkeyOffset,
    pubkeyLength,
    signature,
    cert,
  };
}

/**
 * Convert RSA public key to circuit format
 * Circuit uses n=120, k=35 for RSA-4096 support
 * RSA-2048 keys are padded with zeros to fill 35 chunks
 */
function pubkeyToChunks(publicKey: forge.pki.rsa.PublicKey): string[] {
  const n = publicKey.n;
  const chunks: string[] = [];
  const chunkSize = 120; // bits (circuit parameter n=120)
  const k = 35; // number of chunks (circuit parameter k=35 for RSA-4096)

  for (let i = 0; i < k; i++) {
    const shift = BigInt(i * chunkSize);
    const mask = (BigInt(1) << BigInt(chunkSize)) - BigInt(1);
    const chunk = (BigInt(n.toString()) >> shift) & mask;
    chunks.push(chunk.toString());
  }

  return chunks;
}

/**
 * Convert signature to circuit format (chunked)
 * Circuit uses n=120, k=35 for RSA-4096 support
 * RSA-2048 signatures are padded with zeros to fill 35 chunks
 */
function signatureToChunks(signature: Buffer): string[] {
  const sigBigInt = BigInt('0x' + signature.toString('hex'));
  const chunks: string[] = [];
  const chunkSize = 120; // bits (circuit parameter n=120)
  const k = 35; // number of chunks (circuit parameter k=35 for RSA-4096)

  for (let i = 0; i < k; i++) {
    const shift = BigInt(i * chunkSize);
    const mask = (BigInt(1) << BigInt(chunkSize)) - BigInt(1);
    const chunk = (sigBigInt >> shift) & mask;
    chunks.push(chunk.toString());
  }

  return chunks;
}

/**
 * Re-chunk signature from library format (n=121, k=17) to circuit format (n=120, k=35)
 * ZK-Email's JWT library uses 121-bit chunks (RSA-2048), but our circuit uses 120-bit chunks (RSA-4096)
 */
function rechunkSignatureToK35(signatureChunks: string[]): string[] {
  // Reconstruct BigInt from library's 121-bit chunks (k=17)
  let sigBigInt = BigInt(0);
  const libraryChunkSize = 121; // JWT library uses 121-bit chunks

  for (let i = 0; i < signatureChunks.length; i++) {
    const chunk = BigInt(signatureChunks[i]);
    sigBigInt += chunk << BigInt(i * libraryChunkSize);
  }

  // Re-chunk as 120-bit chunks for circuit (k=35)
  const chunks: string[] = [];
  const circuitChunkSize = 120; // Circuit uses 120-bit chunks
  const k = 35; // Circuit expects 35 chunks for RSA-4096

  for (let i = 0; i < k; i++) {
    const shift = BigInt(i * circuitChunkSize);
    const mask = (BigInt(1) << BigInt(circuitChunkSize)) - BigInt(1);
    const chunk = (sigBigInt >> shift) & mask;
    chunks.push(chunk.toString());
  }

  return chunks;
}

function bufferToByteArray(buffer: Buffer, maxLength: number): string[] {
  const arr = new Array(maxLength).fill('0');
  for (let i = 0; i < buffer.length && i < maxLength; i++) {
    arr[i] = buffer[i].toString();
  }
  return arr;
}

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.error('Usage: tsx prepare.ts <jwt_file.txt> [output_file.json]');
    console.error('Example: tsx prepare.ts example_jwt.txt circuit_inputs.json');
    process.exit(1);
  }

  const inputFile = args[0];
  const outputFile = args[1] || 'circuit_inputs.json';

  try {
    // Read raw JWT string (header.payload.signature)
    const rawJWT = fs.readFileSync(inputFile, 'utf8').trim();

    // Parse header to extract x5c certificate chain
    const [headerB64, payloadB64, jwtSigB64] = rawJWT.split('.');
    const header = JSON.parse(Buffer.from(headerB64, 'base64url').toString('utf8'));
    const payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf8'));

    console.log('[INFO] Loaded raw JWT from', inputFile);
    console.log(`[INFO] Issuer: ${payload.iss}`);
    console.log(`[INFO] Subject: ${payload.sub}`);

    // Extract x5c certificate chain
    if (!header.x5c || !Array.isArray(header.x5c) || header.x5c.length !== 3) {
      throw new Error(`[ERROR] Expected 3 certificates in x5c, got ${header.x5c?.length || 0}`);
    }

    console.log('\n[INFO] Processing certificate chain...\n');

    // Parse all 3 certificates
    const leafCertDer = Buffer.from(header.x5c[0], 'base64');
    const intermediateCertDer = Buffer.from(header.x5c[1], 'base64');
    const rootCertDer = Buffer.from(header.x5c[2], 'base64');

    const leafCert = parseCertificate(leafCertDer);
    console.log();
    const intermediateCert = parseCertificate(intermediateCertDer);
    console.log();
    const rootCert = parseCertificate(rootCertDer);
    console.log();

    // Generate JWT verifier inputs (for JWT signature verification)
    const rsaPublicKey: RSAPublicKey = {
      n: Buffer.from(leafCert.publicKey.n.toByteArray()).toString('base64'),
      e: leafCert.publicKey.e.intValue(),
    };

    console.log('[INFO] Generating JWT verifier inputs...');
    const jwtInputs = await generateJWTVerifierInputs(rawJWT, rsaPublicKey, {
      maxMessageLength: 11776,
    });

    console.log('[INFO] JWT signature verified');

    // Extract eat_nonce[0] from payload
    if (!payload.eat_nonce || !Array.isArray(payload.eat_nonce) || payload.eat_nonce.length === 0) {
      throw new Error('[ERROR] No eat_nonce found in JWT payload');
    }

    const eatNonce0Base64url = payload.eat_nonce[0];
    console.log(`\n[INFO] eat_nonce[0] (base64url): ${eatNonce0Base64url}`);
    console.log(`[INFO] eat_nonce[0] string length: ${eatNonce0Base64url.length} characters`);

    if (eatNonce0Base64url.length > MAX_EAT_NONCE_B64_LENGTH) {
      throw new Error(
        `[ERROR] eat_nonce[0] length ${eatNonce0Base64url.length} exceeds max ${MAX_EAT_NONCE_B64_LENGTH}`
      );
    }

    // Find offset of eat_nonce[0] in the decoded payload JSON
    // Decode the payload from base64url to get the exact JSON string
    const payloadJSON = Buffer.from(payloadB64, 'base64url').toString('utf8');

    // Find key offset: position after the opening quote of "eat_nonce"
    const eatNonceKeyPattern = '"eat_nonce"';
    const eatNonceKeyStart = payloadJSON.indexOf(eatNonceKeyPattern);
    if (eatNonceKeyStart === -1) {
      throw new Error('[ERROR] Could not find "eat_nonce" key in payload JSON');
    }
    const eatNonce0KeyOffset = eatNonceKeyStart + 1; // Position after opening quote

    // Find value offset: position of the actual value
    const eatNonce0ValueOffset = payloadJSON.indexOf(eatNonce0Base64url);
    if (eatNonce0ValueOffset === -1) {
      console.error('[ERROR] Could not find eat_nonce[0] value in decoded payload JSON');
      console.error('[DEBUG] Payload JSON:', payloadJSON);
      console.error('[DEBUG] Looking for:', eatNonce0Base64url);
      throw new Error('[ERROR] Could not find eat_nonce[0] value in decoded payload JSON');
    }

    console.log(`[INFO] eat_nonce key offset in payload: ${eatNonce0KeyOffset}`);
    console.log(`[INFO] eat_nonce[0] value offset in payload: ${eatNonce0ValueOffset}`);

    // Convert base64url string to character codes (ASCII values) for circuit
    const eatNonce0CharCodes = new Array(MAX_EAT_NONCE_B64_LENGTH).fill(0);
    for (let i = 0; i < eatNonce0Base64url.length; i++) {
      eatNonce0CharCodes[i] = eatNonce0Base64url.charCodeAt(i);
    }

    const eatNonce1Base64url = payload.eat_nonce[1];
    console.log(`[INFO] eat_nonce[1] (base64url): ${eatNonce1Base64url}`);
    console.log(`[INFO] eat_nonce[1] string length: ${eatNonce1Base64url.length} characters`);

    if (eatNonce1Base64url.length > MAX_EAT_NONCE_B64_LENGTH) {
      throw new Error(
        `[ERROR] eat_nonce[1] length ${eatNonce1Base64url.length} exceeds max ${MAX_EAT_NONCE_B64_LENGTH}`
      );
    }

    const eatNonce1ValueOffset = payloadJSON.indexOf(eatNonce1Base64url);
    if (eatNonce1ValueOffset === -1) {
      console.error('[ERROR] Could not find eat_nonce[1] value in decoded payload JSON');
      console.error('[DEBUG] Payload JSON:', payloadJSON);
      console.error('[DEBUG] Looking for:', eatNonce1Base64url);
      throw new Error('[ERROR] Could not find eat_nonce[1] value in decoded payload JSON');
    }
    console.log(`[INFO] eat_nonce[1] value offset in payload: ${eatNonce1ValueOffset}`);

    const eatNonce1CharCodes = new Array(MAX_EAT_NONCE_B64_LENGTH).fill(0);
    for (let i = 0; i < eatNonce1Base64url.length; i++) {
      eatNonce1CharCodes[i] = eatNonce1Base64url.charCodeAt(i);
    }

    // Extract image_digest from payload.submods.container.image_digest
    if (!payload.submods?.container?.image_digest) {
      throw new Error('[ERROR] No image_digest found in payload.submods.container');
    }

    const imageDigest = payload.submods.container.image_digest;
    console.log(`\n[INFO] image_digest: ${imageDigest}`);
    console.log(`[INFO] image_digest string length: ${imageDigest.length} characters`);

    if (!imageDigest.startsWith('sha256:')) {
      throw new Error(`[ERROR] image_digest must start with "sha256:", got: ${imageDigest}`);
    }

    if (imageDigest.length !== 71) {
      throw new Error(
        `[ERROR] image_digest must be 71 characters ("sha256:" + 64 hex), got: ${imageDigest.length}`
      );
    }

    if (imageDigest.length > MAX_IMAGE_DIGEST_LENGTH) {
      throw new Error(
        `[ERROR] image_digest length ${imageDigest.length} exceeds max ${MAX_IMAGE_DIGEST_LENGTH}`
      );
    }

    // Find offset of image_digest in the decoded payload JSON
    // Find key offset: position after the opening quote of "image_digest"
    const imageDigestKeyPattern = '"image_digest"';
    const imageDigestKeyStart = payloadJSON.indexOf(imageDigestKeyPattern);
    if (imageDigestKeyStart === -1) {
      throw new Error('[ERROR] Could not find "image_digest" key in payload JSON');
    }
    const imageDigestKeyOffset = imageDigestKeyStart + 1; // Position after opening quote

    // Find value offset: position of the actual value
    const imageDigestValueOffset = payloadJSON.indexOf(imageDigest);
    if (imageDigestValueOffset === -1) {
      console.error('[ERROR] Could not find image_digest value in decoded payload JSON');
      console.error('[DEBUG] Payload JSON:', payloadJSON);
      console.error('[DEBUG] Looking for:', imageDigest);
      throw new Error('[ERROR] Could not find image_digest value in decoded payload JSON');
    }

    console.log(`[INFO] image_digest key offset in payload: ${imageDigestKeyOffset}`);
    console.log(`[INFO] image_digest value offset in payload: ${imageDigestValueOffset}`);

    // Convert image_digest string to character codes (ASCII values) for circuit
    const imageDigestCharCodes = new Array(MAX_IMAGE_DIGEST_LENGTH).fill(0);
    for (let i = 0; i < imageDigest.length; i++) {
      imageDigestCharCodes[i] = imageDigest.charCodeAt(i);
    }

    // Build circuit inputs
    const circuitInputs = {
      // JWT inputs
      message: jwtInputs.message,
      messageLength: jwtInputs.messageLength,
      periodIndex: jwtInputs.periodIndex,

      // x5c[0] - Leaf certificate
      leaf_cert: bufferToByteArray(leafCert.derPadded, MAX_CERT_LENGTH),
      leaf_cert_padded_length: leafCert.paddedLength.toString(),
      leaf_pubkey_offset: leafCert.pubkeyOffset.toString(),
      leaf_pubkey_actual_size: leafCert.pubkeyLength.toString(),

      // x5c[1] - Intermediate certificate
      intermediate_cert: bufferToByteArray(intermediateCert.derPadded, MAX_CERT_LENGTH),
      intermediate_cert_padded_length: intermediateCert.paddedLength.toString(),
      intermediate_pubkey_offset: intermediateCert.pubkeyOffset.toString(),
      intermediate_pubkey_actual_size: intermediateCert.pubkeyLength.toString(),

      // x5c[2] - Root certificate
      root_cert: bufferToByteArray(rootCert.derPadded, MAX_CERT_LENGTH),
      root_cert_padded_length: rootCert.paddedLength.toString(),
      root_pubkey_offset: rootCert.pubkeyOffset.toString(),
      root_pubkey_actual_size: rootCert.pubkeyLength.toString(),

      // Public keys (chunked for RSA circuit)
      leaf_pubkey: pubkeyToChunks(leafCert.publicKey),
      intermediate_pubkey: pubkeyToChunks(intermediateCert.publicKey),
      root_pubkey: pubkeyToChunks(rootCert.publicKey),

      // Signatures (chunked for RSA circuit)
      // JWT signature comes from library as n=121,k=17, re-chunk to n=120,k=35 for circuit
      jwt_signature: rechunkSignatureToK35(jwtInputs.signature),
      leaf_signature: signatureToChunks(leafCert.signature),
      intermediate_signature: signatureToChunks(intermediateCert.signature),

      // EAT nonce[0] (circuit will extract value directly from payload)
      eat_nonce_0_b64_length: eatNonce0Base64url.length.toString(),
      eat_nonce_0_key_offset: eatNonce0KeyOffset.toString(),
      eat_nonce_0_value_offset: eatNonce0ValueOffset.toString(),

      // EAT nonce[1] (circuit will extract value directly from payload)
      eat_nonce_1_b64_length: eatNonce1Base64url.length.toString(),

      // Container image digest (circuit will extract value directly from payload)
      image_digest_length: imageDigest.length.toString(),
      image_digest_key_offset: imageDigestKeyOffset.toString(),
      image_digest_value_offset: imageDigestValueOffset.toString(),
    };

    fs.writeFileSync(outputFile, JSON.stringify(circuitInputs, null, 2));

    console.log('\n[INFO] Circuit inputs saved to', outputFile);
  } catch (error) {
    console.error('[ERROR]', error instanceof Error ? error.message : error);
    if (error instanceof Error && error.stack) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

main();
