import * as fs from 'fs';
import * as path from 'path';
import { parseCertificateSimple } from '../../../common/src/utils/certificate_parsing/parseCertificateSimple';
import { findStartPubKeyIndex } from '../../../common/src/utils/passports/passport';

// Function to convert DER to PEM
function derToPem(derBuffer: Buffer): string {
  const base64 = derBuffer.toString('base64');
  const pem = `-----BEGIN CERTIFICATE-----\n${base64.match(/.{1,64}/g)!.join('\n')}\n-----END CERTIFICATE-----\n`;
  return pem;
}

export const findSequenceMatches = (haystack: number[], needle: number[]): {count: number, indexes: number[]} => {
  const matches: number[] = [];
  for (let i = 0; i < haystack.length - needle.length + 1; i++) {
    let found = true;
    for (let j = 0; j < needle.length; j++) {
      if (haystack[i + j] !== needle[j]) {
        found = false;
        break;
      }
    }
    if (found) {
      matches.push(i);
    }
  }
  return {
    count: matches.length,
    indexes: matches
  };
};


export async function extractMasterlistCsca() {
  const csca_path = path.join(__dirname, '..', '..', 'outputs', 'dsc');
  const uniqueCertsDir = path.join(csca_path, 'pem_masterlist');

  if (!fs.existsSync(uniqueCertsDir)) {
    console.error(`Directory ${uniqueCertsDir} does not exist.`);
    return;
  }

  const certificateFiles = fs.readdirSync(uniqueCertsDir).filter(file => file.endsWith('.pem'));
  const certArray: string[] = certificateFiles.map(file => {
    const filePath = path.join(uniqueCertsDir, file);
    return fs.readFileSync(filePath, 'utf-8');
  });

  console.log(`Read ${certArray.length} certificates.`);
  const overallSequenceMatchCounts = [0, 0, 0]; // Initialize counters for each sequence
  const multipleMatches = [];
  const bytesBeforeSequenceMap = new Map<string, {count: number, bitSize: number}>();
  const bytesBeforeSequenceTbsMap = new Map<string, number[]>();

  for (let i = 0; i < certArray.length; i++) {
    const pemContent = certArray[i];
    const parsed = parseCertificateSimple(pemContent);
    if (parsed.signatureAlgorithm === 'rsa' || parsed.signatureAlgorithm === 'rsapss') {
    // if (parsed.signatureAlgorithm === 'ecdsa') {
      continue;
    }
    let matchCount = 0;
    
    const tbsBytesArray = Array.from(parsed.tbsBytes);

    const sequences = [
      // [2, 130, 1, 1, 0], // 2048 bits, 8 matches
      // [2, 130, 2, 1, 0], // 4096 bits, 509 matches
      // [2, 130, 1, 129, 0], // 3072 bits, 81 matches
      // [2, 130, 3, 1, 0], // 6144 bits, 10 matches. Moldova. Not supported.


      // ECDSA
      // [48, 60, 4, 28], // 224 bits
      // [48, 68, 4, 32], // 256 bits,
      // [48, 100, 4, 48], // 384 bits,
      // [48, 129, 132, 4], // 512 bits,
      // [48, 129, 135, 4], // 521 bits,
      // [48, 91, 4, 32], // 256 bits, 3 fields (Russia)
      // [48, 125, 4, 49], // 384 bits, 3 fields (Moldova)
      // [48, 123, 4, 48], // 384 bits, 3 fields (GB)
      // [48, 129, 136, 4], // 521 bits, 3 fields (Iceland)
      // [35, 3, 129, 134], // 576, 625 Turkey is doing something weird
      // [0, 34, 3, 98], // 633, 676, 678 Algeria and Israel


      // TEST
      // [1, 5, 3, 58], // brainpool 224
      // [0, 33, 3, 58], // secp 224
      // [1, 7, 3, 66], // brainpool 256
      // [1, 11, 3, 98], // brainpool 384
      // [1, 13, 3, 129] // brainpool 521
    ];

    // const bitSizes = [2048, 4096, 3072];
    const bitSizes = [224, 256, 384, 512, 521, 256, 384, 384, 521, 521, 384, 224, 256, 224, 384, 521];
    const [startIndex, keyLength] = findStartPubKeyIndex(parsed, tbsBytesArray, parsed.signatureAlgorithm);

    // Get bytes before the public key
    const bytesBeforeKey = tbsBytesArray.slice(Math.max(0, startIndex - 33), startIndex);
    const bytesKey = bytesBeforeKey.map(b => `0x${b.toString(16).padStart(2, '0')}`).join(', ');
    
    // Store in map with count and key size
    const keyBits = parsed.publicKeyDetails.bits;
    bytesBeforeSequenceMap.set(bytesKey, {
      count: (bytesBeforeSequenceMap.get(bytesKey)?.count || 0) + 1,
      bitSize: Number(keyBits)
    });

    // Store full TBS bytes for reference
    if (!bytesBeforeSequenceTbsMap.has(bytesKey)) {
      bytesBeforeSequenceTbsMap.set(bytesKey, tbsBytesArray);
    }

    matchCount++;

    if (matchCount > 1) {
      console.log(`Certificate ${i} with ${parsed.signatureAlgorithm} has sequences matched ${matchCount} times.`);
      console.log('tbsBytesArray:', JSON.stringify(tbsBytesArray.map(b => `0x${b.toString(16).padStart(2, '0')}`)));
    }

    if (matchCount === 0) {
      console.log(`Certificate ${i} with ${parsed.signatureAlgorithm} missing expected byte sequence`);
    }

    if (i > 0 && i % 100 === 0) {
      console.log(`Processed ${i} certificates...`);
    }
  }

  console.log('\nDifferent byte sequences found before key sequences, sorted by bit size:');
  // Sort entries by bit size
  const sortedEntries = Array.from(bytesBeforeSequenceMap.entries()).sort((a, b) => a[1].bitSize - b[1].bitSize);
  
  sortedEntries.forEach(([bytes, {count, bitSize}]) => {
    console.log(`${bitSize}-bit key - Sequence [${bytes}] appears ${count} times`);
    const tbsBytes = bytesBeforeSequenceTbsMap.get(bytes);
    if (tbsBytes) {
      // console.log('Example TBS certificate PEM:');
      // console.log(derToPem(Buffer.from(tbsBytes)));
    }
  });
  console.log(`Total unique sequences: ${bytesBeforeSequenceMap.size}`);

  // Log the number of matches for each sequence
  console.log(`Sequence match counts:`);
  console.log(`[2, 130, 1, 1, 0]: ${overallSequenceMatchCounts[0]}`);
  console.log(`[2, 130, 2, 1, 0]: ${overallSequenceMatchCounts[1]}`);
  console.log(`[2, 130, 1, 129, 0]: ${overallSequenceMatchCounts[2]}`);

  console.log(`Certificate with multiple sequence matches length: ${multipleMatches.length}`);
  console.log(`Certificate with multiple sequence matches: ${multipleMatches}`);
}

extractMasterlistCsca();


// ----------------- BETTER METHOD -----------------


// ECDSA

// 224-bit key - Sequence [0x34, 0xaa, 0x26, 0x43, 0x66, 0x86, 0x2a, 0x18, 0x30, 0x25, 0x75, 0xd0, 0xfb, 0x98, 0xd1, 0x16, 0xbc, 0x4b, 0x6d, 0xde, 0xbc, 0xa3, 0xa5, 0xa7, 0x93, 0x9f, 0x02, 0x01, 0x01, 0x03, 0x3a, 0x00, 0x04] appears 74 times
// 224-bit key - Sequence [0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0x16, 0xa2, 0xe0, 0xb8, 0xf0, 0x3e, 0x13, 0xdd, 0x29, 0x45, 0x5c, 0x5c, 0x2a, 0x3d, 0x02, 0x01, 0x01, 0x03, 0x3a, 0x00, 0x04] appears 1 times
// 256-bit key - Sequence [0xa9, 0xbc, 0x3e, 0x66, 0x0a, 0x90, 0x9d, 0x83, 0x8d, 0x71, 0x8c, 0x39, 0x7a, 0xa3, 0xb5, 0x61, 0xa6, 0xf7, 0x90, 0x1e, 0x0e, 0x82, 0x97, 0x48, 0x56, 0xa7, 0x02, 0x01, 0x01, 0x03, 0x42, 0x00, 0x04] appears 51 times
// 256-bit key - Sequence [0x00, 0x00, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xbc, 0xe6, 0xfa, 0xad, 0xa7, 0x17, 0x9e, 0x84, 0xf3, 0xb9, 0xca, 0xc2, 0xfc, 0x63, 0x25, 0x51, 0x02, 0x01, 0x01, 0x03, 0x42, 0x00, 0x04] appears 19 times
// 256-bit key - Sequence [0xdb, 0xa1, 0xee, 0xa9, 0xbc, 0x3e, 0x66, 0x0a, 0x90, 0x9d, 0x83, 0x8d, 0x71, 0x8c, 0x39, 0x7a, 0xa3, 0xb5, 0x61, 0xa6, 0xf7, 0x90, 0x1e, 0x0e, 0x82, 0x97, 0x48, 0x56, 0xa7, 0x03, 0x42, 0x00, 0x04] appears 2 times
// 256-bit key - Sequence [0x06, 0x13, 0x02, 0x4e, 0x4c, 0x30, 0x5a, 0x30, 0x14, 0x06, 0x07, 0x2a, 0x86, 0x48, 0xce, 0x3d, 0x02, 0x01, 0x06, 0x09, 0x2b, 0x24, 0x03, 0x03, 0x02, 0x08, 0x01, 0x01, 0x07, 0x03, 0x42, 0x00, 0x04] appears 1 times
// 384-bit key - Sequence [0x56, 0xb3, 0x1f, 0x16, 0x6e, 0x6c, 0xac, 0x04, 0x25, 0xa7, 0xcf, 0x3a, 0xb6, 0xaf, 0x6b, 0x7f, 0xc3, 0x10, 0x3b, 0x88, 0x32, 0x02, 0xe9, 0x04, 0x65, 0x65, 0x02, 0x01, 0x01, 0x03, 0x62, 0x00, 0x04] appears 54 times
// 384-bit key - Sequence [0xff, 0xff, 0xc7, 0x63, 0x4d, 0x81, 0xf4, 0x37, 0x2d, 0xdf, 0x58, 0x1a, 0x0d, 0xb2, 0x48, 0xb0, 0xa7, 0x7a, 0xec, 0xec, 0x19, 0x6a, 0xcc, 0xc5, 0x29, 0x73, 0x02, 0x01, 0x01, 0x03, 0x62, 0x00, 0x04] appears 30 times
// 384-bit key - Sequence [0x41, 0x2d, 0x41, 0x4c, 0x47, 0x45, 0x52, 0x49, 0x41, 0x30, 0x76, 0x30, 0x10, 0x06, 0x07, 0x2a, 0x86, 0x48, 0xce, 0x3d, 0x02, 0x01, 0x06, 0x05, 0x2b, 0x81, 0x04, 0x00, 0x22, 0x03, 0x62, 0x00, 0x04] appears 3 times
// 384-bit key - Sequence [0x55, 0x04, 0x0b, 0x0c, 0x04, 0x50, 0x49, 0x42, 0x41, 0x30, 0x76, 0x30, 0x10, 0x06, 0x07, 0x2a, 0x86, 0x48, 0xce, 0x3d, 0x02, 0x01, 0x06, 0x05, 0x2b, 0x81, 0x04, 0x00, 0x22, 0x03, 0x62, 0x00, 0x04] appears 1 times
// 512-bit key - Sequence [0x19, 0x41, 0x86, 0x61, 0x19, 0x7f, 0xac, 0x10, 0x47, 0x1d, 0xb1, 0xd3, 0x81, 0x08, 0x5d, 0xda, 0xdd, 0xb5, 0x87, 0x96, 0x82, 0x9c, 0xa9, 0x00, 0x69, 0x02, 0x01, 0x01, 0x03, 0x81, 0x82, 0x00, 0x04] appears 11 times
// 521-bit key - Sequence [0x6b, 0x7f, 0xcc, 0x01, 0x48, 0xf7, 0x09, 0xa5, 0xd0, 0x3b, 0xb5, 0xc9, 0xb8, 0x89, 0x9c, 0x47, 0xae, 0xbb, 0x6f, 0xb7, 0x1e, 0x91, 0x38, 0x64, 0x09, 0x02, 0x01, 0x01, 0x03, 0x81, 0x86, 0x00, 0x04] appears 7 times
// 521-bit key - Sequence [0x20, 0x54, 0x75, 0x72, 0x6b, 0x65, 0x79, 0x30, 0x81, 0x9b, 0x30, 0x10, 0x06, 0x07, 0x2a, 0x86, 0x48, 0xce, 0x3d, 0x02, 0x01, 0x06, 0x05, 0x2b, 0x81, 0x04, 0x00, 0x23, 0x03, 0x81, 0x86, 0x00, 0x04] appears 2 times


// ----------------- RSA -----------------

// 2048 bits
// Sequence [48,130,1,34,48,13,6,9,42,134,72,134,247,13,1,1,1,5,0,3,130,1,15,0,48,130,1,10,2,130,1,1,0] appears 8 times, supported

// Sequence [48,130,1,34, Sequence of 290 bytes
// 48,13, // sequence of 13 bytes
// 6,9, // object identifier
// 42,134,72,134,247,13,1,1,1, // OID of 9 bytes
// 5,0, // 2 NULL bytes
// 3,130,1,15,0, // Bitstring of 271 bytes
// 48,130,1,10, // Sequence of 266 bytes
// 2,130,1,1,0 // prefix (integer of 257 bytes)
// .... key of 256 bytes
// 2,3 // integer of 3 bytes
// 1,0,1 // exponent of 3 bytes
// ]

// 3072 bits
// Sequence [48,130,1,162,48,13,6,9,42,134,72,134,247,13,1,1,1,5,0,3,130,1,143,0,48,130,1,138] appears 73 times // e=65537, supported
// Sequence [48,130,1,160,48,13,6,9,42,134,72,134,247,13,1,1,1,5,0,3,130,1,141,0,48,130,1,136] appears 8 times // e=3, supported

// 4096 bits
// Sequence [48,130,2,34,48,13,6,9,42,134,72,134,247,13,1,1,1,5,0,3,130,2,15,0,48,130,2,10] appears 494 times => e=65537, supported
// Sequence [48,130,2,32,48,13,6,9,42,134,72,134,247,13,1,1,1,5,0,3,130,2,13,0,48,130,2,8] appears 12 times => e=3, chinese
// Sequence [105,97,48,130,2,32,48,11,6,9,42,134,72,134,247,13,1,1,1,3,130,2,15,0,48,130,2,10] appears 3 times => e=65537, estonia, openSSL formatting



// Mock

// 2048-bit key - Sequence [67,65,48,130,1,32,48,11,6,9,42,134,72,134,247,13,1,1,10,3,130,1,15,0,48,130,1,10] appears 1 times rsaPss OID, e=65537

// Sequence [48,130,1,32,
// 48,11,
// 6,9,
// 42,134,72,134,247,13,1,1,10,
// MISSING 2 NULL bytes
// 3,130,1,15,0,
// 48,130,1,10] appears 1 times rsaPss OID, e=65537

// 3072-bit key - Sequence [67,65,48,130,1,158,48,11,6,9,42,134,72,134,247,13,1,1,10,3,130,1,141,0,48,130,1,136] appears 1 times rsaPss OID, e=3
// 3072-bit key - Sequence [67,65,48,130,1,160,48,11,6,9,42,134,72,134,247,13,1,1,10,3,130,1,143,0,48,130,1,138] appears 2 times rsaPss OID, e=65537

// 4096-bit key - Sequence       [48,130,2,32,48,13,6,9,42,134,72,134,247,13,1,1,1,5,0,3,130,2,13,0,48,130,2,8] appears 2 times ----
// 4096-bit key - Sequence       [48,130,2,34,48,13,6,9,42,134,72,134,247,13,1,1,1,5,0,3,130,2,15,0,48,130,2,10] appears 4 times ----
// 4096-bit key - Sequence [67,65,48,130,2,30,48,11,6,9,42,134,72,134,247,13,1,1,10,||,3,130,2,13,0,48,130,2,8] appears 1 times rsaPss OID, e=3
// 4096-bit key - Sequence [67,65,48,130,2,32,48,11,6,9,42,134,72,134,247,13,1,1,10,||,3,130,2,15,0,48,130,2,10] appears 3 times rsaPss OID, e=65537


// pass the index of the first byte of the top level sequence.
// - Circuit fetches the whitelisted sequences and their sizes
// - Check the whole sequence up to its size <== this could be missing the two null bytes
// - If circuit supports multiple bit sizes, check which bitsize is associated with this prefix
// - extract pubkey
// - check suffix is the modulus of the circuit





// ----------------- ECDSA -----------------

// 224-bit key - Sequence [215,193,52,170,38,67,102,134,42,24,48,37,117,209,215,135,176,159,7,87,151,218,137,245,126,200,192,255,48,60,4,28,104] appears 74 times
// 256-bit key - Sequence [161,238,169,188,62,102,10,144,157,131,141,114,110,59,246,35,213,38,32,40,32,19,72,29,31,110,83,119,48,68,4,32,125] appears 51 times
// 256-bit key - Sequence [0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,255,255,255,255,255,255,255,255,255,255,255,255,48,68,4,32,255] appears 7 times
// 256-bit key - Sequence [0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,255,255,255,255,255,255,255,255,255,255,255,255,48,91,4,32,255] appears 12 times
// 384-bit key - Sequence [237,84,86,180,18,177,218,25,127,183,17,35,172,211,167,41,144,29,26,113,135,71,0,19,49,7,236,83,48,100,4,48,123] appears 54 times
// 384-bit key - Sequence [255,255,255,255,255,255,255,255,255,255,255,254,255,255,255,255,0,0,0,0,0,0,0,0,255,255,255,255,48,100,4,48,255] appears 22 times
// 384-bit key - Sequence [255,255,255,255,255,255,255,255,255,255,255,254,255,255,255,255,0,0,0,0,0,0,0,0,255,255,255,255,48,125,4,49,0] appears 1 times
// 384-bit key - Sequence [255,255,255,255,255,255,255,255,255,255,255,254,255,255,255,255,0,0,0,0,0,0,0,0,255,255,255,255,48,123,4,48,255] appears 7 times
// 384-bit key - Sequence [67,65,45,65,76,71,69,82,73,65,48,118,48,16,6,7,42,134,72,206,61,2,1,6,5,43,129,4,0,34,3,98,0] appears 3 times
// 384-bit key - Sequence [3,85,4,11,12,4,80,73,66,65,48,118,48,16,6,7,42,134,72,206,61,2,1,6,5,43,129,4,0,34,3,98,0] appears 1 times
// 512-bit key - Sequence [155,198,104,66,174,205,161,42,230,163,128,230,40,129,255,47,45,130,198,133,40,170,96,86,88,58,72,243,48,129,132,4,64] appears 12 times
// 521-bit key - Sequence [255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,48,129,135,4,66] appears 11 times
// 521-bit key - Sequence [255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,48,129,136,4,66] appears 5 times
// 521-bit key - Sequence [65,32,84,117,114,107,101,121,48,129,155,48,16,6,7,42,134,72,206,61,2,1,6,5,43,129,4,0,35,3,129,134,0] appears 2 times


// TEST certs:
// For them, the common denominator is the first 23 bytes, because before you don't have the full parameter, so you end up directly with a name (MockDSC/MockCSCA)

// CSCA
// 224-bit key - Sequence [99,107,67,83,67,65,48,82,48,20,6,7,42,134,72,206,61,2,1,6,9,43,36,3,3,2,8,1,1,5,3,58,0] appears 3 times
// 224-bit key - Sequence [12,8,77,111,99,107,67,83,67,65,48,78,48,16,6,7,42,134,72,206,61,2,1,6,5,43,129,4,0,33,3,58,0] appears 1 times
// 256-bit key - Sequence [99,107,67,83,67,65,48,90,48,20,6,7,42,134,72,206,61,2,1,6,9,43,36,3,3,2,8,1,1,7,3,66,0] appears 4 times
// 256-bit key - Sequence [111,99,107,67,83,67,65,48,89,48,19,6,7,42,134,72,206,61,2,1,6,8,42,134,72,206,61,3,1,7,3,66,0] appears 2 times
// 384-bit key - Sequence [99,107,67,83,67,65,48,122,48,20,6,7,42,134,72,206,61,2,1,6,9,43,36,3,3,2,8,1,1,11,3,98,0] appears 3 times
// 384-bit key - Sequence [12,8,77,111,99,107,67,83,67,65,48,118,48,16,6,7,42,134,72,206,61,2,1,6,5,43,129,4,0,34,3,98,0] appears 2 times
// 521-bit key - Sequence [77,111,99,107,67,83,67,65,48,129,155,48,16,6,7,42,134,72,206,61,2,1,6,5,43,129,4,0,35,3,129,134,0] appears 2 times
// 521-bit key - Sequence [107,67,83,67,65,48,129,155,48,20,6,7,42,134,72,206,61,2,1,6,9,43,36,3,3,2,8,1,1,13,3,129,130] appears 2 times

// DSC
// 224-bit key - Sequence [111,99,107,68,83,67,48,82,48,20,6,7,42,134,72,206,61,2,1,6,9,43,36,3,3,2,8,1,1,5,3,58,0] appears 3 times
// 224-bit key - Sequence [3,12,7,77,111,99,107,68,83,67,48,78,48,16,6,7,42,134,72,206,61,2,1,6,5,43,129,4,0,33,3,58,0] appears 1 times
// 256-bit key - Sequence [111,99,107,68,83,67,48,90,48,20,6,7,42,134,72,206,61,2,1,6,9,43,36,3,3,2,8,1,1,7,3,66,0] appears 4 times
// 256-bit key - Sequence [77,111,99,107,68,83,67,48,89,48,19,6,7,42,134,72,206,61,2,1,6,8,42,134,72,206,61,3,1,7,3,66,0] appears 2 times
// 384-bit key - Sequence [111,99,107,68,83,67,48,122,48,20,6,7,42,134,72,206,61,2,1,6,9,43,36,3,3,2,8,1,1,11,3,98,0] appears 3 times
// 384-bit key - Sequence [3,12,7,77,111,99,107,68,83,67,48,118,48,16,6,7,42,134,72,206,61,2,1,6,5,43,129,4,0,34,3,98,0] appears 2 times
// 521-bit key - Sequence [7,77,111,99,107,68,83,67,48,129,155,48,16,6,7,42,134,72,206,61,2,1,6,5,43,129,4,0,35,3,129,134,0] appears 2 times
// 521-bit key - Sequence [99,107,68,83,67,48,129,155,48,20,6,7,42,134,72,206,61,2,1,6,9,43,36,3,3,2,8,1,1,13,3,129,130] appears 2 times


// CROPPED to what is in common between CSCA and DSC:

// 224-bit key - Sequence [48,82,48,20,6,7,42,134,72,206,61,2,1,6,9,43,36,3,3,2,8,1,1,5,3,58,0] appears 3 times // 27 bytes
// 224-bit key - Sequence [48,78,48,16,6,7,42,134,72,206,61,2,1,6,5,43,129,4,0,33,3,58,0] appears 1 times // 23 bytes
// 256-bit key - Sequence [48,90,48,20,6,7,42,134,72,206,61,2,1,6,9,43,36,3,3,2,8,1,1,7,3,66,0] appears 4 times
// 256-bit key - Sequence [48,89,48,19,6,7,42,134,72,206,61,2,1,6,8,42,134,72,206,61,3,1,7,3,66,0] appears 2 times
// 384-bit key - Sequence [48,122,48,20,6,7,42,134,72,206,61,2,1,6,9,43,36,3,3,2,8,1,1,11,3,98,0] appears 3 times
// 384-bit key - Sequence [48,118,48,16,6,7,42,134,72,206,61,2,1,6,5,43,129,4,0,34,3,98,0] appears 2 times
// 521-bit key - Sequence [48,129,155,48,16,6,7,42,134,72,206,61,2,1,6,5,43,129,4,0,35,3,129,134,0] appears 2 times
// 521-bit key - Sequence [48,129,155,48,20,6,7,42,134,72,206,61,2,1,6,9,43,36,3,3,2,8,1,1,13,3,129,130] appears 2 times

// CROPPED to 23 bytes:

// 224-bit key - Sequence [48,37,117,209,215,135,176,159,7,87,151,218,137,245,126,200,192,255,48,60,4,28,104] appears 74 times
// 256-bit key - Sequence [141,114,110,59,246,35,213,38,32,40,32,19,72,29,31,110,83,119,48,68,4,32,125] appears 51 times
// 256-bit key - Sequence [0,0,0,0,0,0,255,255,255,255,255,255,255,255,255,255,255,255,48,68,4,32,255] appears 7 times
// 256-bit key - Sequence [0,0,0,0,0,0,255,255,255,255,255,255,255,255,255,255,255,255,48,91,4,32,255] appears 12 times
// 384-bit key - Sequence [17,35,172,211,167,41,144,29,26,113,135,71,0,19,49,7,236,83,48,100,4,48,123] appears 54 times
// 384-bit key - Sequence [255,254,255,255,255,255,0,0,0,0,0,0,0,0,255,255,255,255,48,100,4,48,255] appears 22 times
// 384-bit key - Sequence [255,254,255,255,255,255,0,0,0,0,0,0,0,0,255,255,255,255,48,125,4,49,0] appears 1 times
// 384-bit key - Sequence [255,254,255,255,255,255,0,0,0,0,0,0,0,0,255,255,255,255,48,123,4,48,255] appears 7 times
// 384-bit key - Sequence [48,118,48,16,6,7,42,134,72,206,61,2,1,6,5,43,129,4,0,34,3,98,0] appears 3 times
// 384-bit key - Sequence [48,118,48,16,6,7,42,134,72,206,61,2,1,6,5,43,129,4,0,34,3,98,0] appears 1 times
// 512-bit key - Sequence [128,230,40,129,255,47,45,130,198,133,40,170,96,86,88,58,72,243,48,129,132,4,64] appears 12 times
// 521-bit key - Sequence [255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,48,129,135,4,66] appears 11 times
// 521-bit key - Sequence [255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,48,129,136,4,66] appears 5 times
// 521-bit key - Sequence [155,48,16,6,7,42,134,72,206,61,2,1,6,5,43,129,4,0,35,3,129,134,0] appears 2 times

// TEST certs:
// 224-bit key - Sequence [6,7,42,134,72,206,61,2,1,6,9,43,36,3,3,2,8,1,1,5,3,58,0] appears 3 times
// 224-bit key - Sequence [48,78,48,16,6,7,42,134,72,206,61,2,1,6,5,43,129,4,0,33,3,58,0] appears 1 times
// 256-bit key - Sequence [6,7,42,134,72,206,61,2,1,6,9,43,36,3,3,2,8,1,1,7,3,66,0] appears 4 times
// 256-bit key - Sequence [19,6,7,42,134,72,206,61,2,1,6,8,42,134,72,206,61,3,1,7,3,66,0] appears 2 times
// 384-bit key - Sequence [6,7,42,134,72,206,61,2,1,6,9,43,36,3,3,2,8,1,1,11,3,98,0] appears 3 times
// 384-bit key - Sequence [48,118,48,16,6,7,42,134,72,206,61,2,1,6,5,43,129,4,0,34,3,98,0] appears 2 times
// 521-bit key - Sequence [155,48,16,6,7,42,134,72,206,61,2,1,6,5,43,129,4,0,35,3,129,134,0] appears 2 times
// 521-bit key - Sequence [6,7,42,134,72,206,61,2,1,6,9,43,36,3,3,2,8,1,1,13,3,129,130] appears 2 times

