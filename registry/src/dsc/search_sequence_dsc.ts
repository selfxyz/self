import * as fs from 'fs';
import * as path from 'path';
import { parseCertificateSimple } from '../../../common/src/utils/certificate_parsing/parseCertificateSimple';

// Function to convert DER to PEM
function derToPem(derBuffer: Buffer): string {
  const base64 = derBuffer.toString('base64');
  const pem = `-----BEGIN CERTIFICATE-----\n${base64.match(/.{1,64}/g)!.join('\n')}\n-----END CERTIFICATE-----\n`;
  return pem;
}

const findSequenceMatches = (haystack: number[], needle: number[]): {count: number, indexes: number[]} => {
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

export async function extractMasterlistDsc() {
  // Read pem certificates from the output directory
  const pem_path = path.join(__dirname, '..', '..', 'outputs', 'dsc', 'pem_masterlist');

  if (!fs.existsSync(pem_path)) {
    console.error(`Directory ${pem_path} does not exist.`);
    return;
  }

  const certificateFiles = fs.readdirSync(pem_path).filter(file => file.endsWith('.pem'));
  const certificates: string[] = certificateFiles.map(file => {
    const filePath = path.join(pem_path, file);
    return fs.readFileSync(filePath, 'utf-8');
  });

  console.log(`Read ${certificates.length} certificates.`);
  const overallSequenceMatchCounts = [0, 0, 0]; // Initialize counters for each sequence
  const multipleMatches = [];
  const bytesBeforeSequenceMap = new Map<string, {count: number, bitSize: number}>();
  const bytesBeforeSequenceTbsMap = new Map<string, number[]>();

  for (let i = 0; i < certificates.length; i++) {
    const pemContent = certificates[i];
    const parsed = parseCertificateSimple(pemContent);
    // if (parsed.signatureAlgorithm === 'rsa' || parsed.signatureAlgorithm === 'rsapss') {
    if (parsed.signatureAlgorithm === 'ecdsa') {
      continue;
    }
    let matchCount = 0;
    
    const tbsBytesArray = Array.from(parsed.tbsBytes);
    const sequences = [
      [2, 130, 1, 1, 0], // 2048 bits, 23963 matches
      [2, 130, 2, 1, 0], // 4096 bits, 200 matches
      [2, 130, 1, 129, 0], // 3072 bits, 528 matches
      // a few certs between 23502 and 23527 and around have 1024 bits
      // they have [2, 129, 129, 0, 210/186/194...]
      // we don't support them.

      // // ECDSA
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

      // // 16762 this one is no good 

      // [1, 5, 3, 58], // brainpool 224
      // [1, 7, 3, 66], // brainpool 256
      // [0, 33, 3, 58], // secp 224
      // [1, 11, 3, 98], // brainpool 384
      // [1, 13, 3, 129] // brainpool 521

    ];

    const bitSizes = [2048, 4096, 3072];
    // const bitSizes = [224, 256, 384, 512, 521, 256, 384, 384, 521, 521, 384, 224, 256, 224, 384, 521];


    sequences.forEach((sequence, index) => {
      const {count: currentMatchCount, indexes} = findSequenceMatches(tbsBytesArray, sequence);
      
      if (currentMatchCount > 0) {
        matchCount += currentMatchCount;
        overallSequenceMatchCounts[index] += currentMatchCount;
        if (currentMatchCount > 1) {
          multipleMatches.push(i, currentMatchCount, sequence.join(','));
        }

        if (indexes.length > 0) {
          const sequencePos = indexes[0];
          const bytesBeforeSequence = tbsBytesArray.slice(Math.max(0, sequencePos - 28), sequencePos + 5);
          const bytesKey = bytesBeforeSequence.join(',');
          bytesBeforeSequenceMap.set(bytesKey, {
            count: (bytesBeforeSequenceMap.get(bytesKey)?.count || 0) + 1,
            bitSize: bitSizes[index]
          });
          if (!bytesBeforeSequenceTbsMap.has(bytesKey)) {
            bytesBeforeSequenceTbsMap.set(bytesKey, tbsBytesArray);
          }
        }
      }
    });

    if (matchCount > 1) {
      console.log(`Certificate ${i} with ${parsed.signatureAlgorithm} has sequences matched ${matchCount} times.`);
      console.log('tbsBytesArray:', JSON.parse(JSON.stringify(tbsBytesArray)));
    }

    if (matchCount === 0) {
      console.log(`Certificate ${i} with ${parsed.signatureAlgorithm} missing expected byte sequence`);
      // console.log(derToPem(Buffer.from(tbsBytesArray)));
      // return
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

  // Log the overall number of matches for each sequence
  console.log(`Overall sequence match counts:`);
  console.log(`[2, 130, 1, 1, 0]: ${overallSequenceMatchCounts[0]}`);
  console.log(`[2, 130, 2, 1, 0]: ${overallSequenceMatchCounts[1]}`);
  console.log(`[2, 130, 1, 129, 0]: ${overallSequenceMatchCounts[2]}`);

  console.log(`Certificate with multiple sequence matches length: ${multipleMatches.length}`);
  console.log(`Certificate with multiple sequence matches: ${multipleMatches}`);
}

extractMasterlistDsc();


// ----------------- RSA -----------------

// 2048-bit key - Sequence [48,130,1,34,48,13,6,9,42,134,72,134,247,13,1,1,1,5,0,3,130,1,15,0,48,130,1,10] appears 23080 times // e=65537
// 2048-bit key - Sequence [48,130,1,32,48,13,6,9,42,134,72,134,247,13,1,1,1,5,0,3,130,1,13,0,48,130,1,8] appears 883 times // e=3

// 3072-bit key - Sequence [48,130,1,162,48,13,6,9,42,134,72,134,247,13,1,1,1,5,0,3,130,1,143,0,48,130,1,138] appears 528 times // e=65537

// 4096-bit key - Sequence [48,130,2,34,48,13,6,9,42,134,72,134,247,13,1,1,1,5,0,3,130,2,15,0,48,130,2,10] appears 200 times // e=65537



// Mock

// 2048-bit key - Sequence [48,130,1,34,48,13,6,9,42,134,72,134,247,13,1,1,1,5,0,3,130,1,15,0,48,130,1,10] appears 3 times ----
// 2048-bit key - Sequence [48,130,1,32,48,13,6,9,42,134,72,134,247,13,1,1,1,5,0,3,130,1,13,0,48,130,1,8] appears 1 times ----
// 2048-bit key - Sequence [83,67,48,130,1,30,48,11,6,9,42,134,72,134,247,13,1,1,10,3,130,1,13,0,48,130,1,8] appears 1 times rsaPss OID, e=3
// 2048-bit key - Sequence [83,67,48,130,1,32,48,11,6,9,42,134,72,134,247,13,1,1,10,3,130,1,15,0,48,130,1,10] appears 3 times rsaPss OID, e=65537

// 3072-bit key - Sequence [48,130,1,162,48,13,6,9,42,134,72,134,247,13,1,1,1,5,0,3,130,1,143,0,48,130,1,138] appears 1 times ----
// 3072-bit key - Sequence [83,67,48,130,1,158,48,11,6,9,42,134,72,134,247,13,1,1,10,3,130,1,141,0,48,130,1,136] appears 1 times rsaPss OID, e=3
// 3072-bit key - Sequence [83,67,48,130,1,160,48,11,6,9,42,134,72,134,247,13,1,1,10,3,130,1,143,0,48,130,1,138] appears 2 times rsaPss OID, e=65537

// 4096-bit key - Sequence [48,130,2,32,48,13,6,9,42,134,72,134,247,13,1,1,1,5,0,3,130,2,13,0,48,130,2,8] appears 2 times e=3
// 4096-bit key - Sequence [48,130,2,34,48,13,6,9,42,134,72,134,247,13,1,1,1,5,0,3,130,2,15,0,48,130,2,10] appears 4 times ----
// 4096-bit key - Sequence [83,67,48,130,2,30,48,11,6,9,42,134,72,134,247,13,1,1,10,3,130,2,13,0,48,130,2,8] appears 1 times rsaPss OID, e=3
// 4096-bit key - Sequence [83,67,48,130,2,32,48,11,6,9,42,134,72,134,247,13,1,1,10,3,130,2,15,0,48,130,2,10] appears 2 times rsaPss OID, e=65537





// ----------------- ECDSA -----------------

// 256-bit key - Sequence [215,193,52,170,38,67,102,134,42,24,48,37,117,209,215,135,176,159,7,87,151,218,137,245,126,200,192,255,48,60,4,28,104] appears 74 times
// 384-bit key - Sequence [0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,255,255,255,255,255,255,255,255,255,255,255,255,48,68,4,32,255] appears 1118 times
// 384-bit key - Sequence [161,238,169,188,62,102,10,144,157,131,141,114,110,59,246,35,213,38,32,40,32,19,72,29,31,110,83,119,48,68,4,32,125] appears 472 times
// 384-bit key - Sequence [0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,255,255,255,255,255,255,255,255,255,255,255,255,48,91,4,32,255] appears 767 times
// 384-bit key - Sequence [255,255,255,255,255,255,255,255,255,255,255,254,255,255,255,255,0,0,0,0,0,0,0,0,255,255,255,255,48,125,4,49,0] appears 1 times
// 512-bit key - Sequence [255,255,255,255,255,255,255,255,255,255,255,254,255,255,255,255,0,0,0,0,0,0,0,0,255,255,255,255,48,100,4,48,255] appears 73 times
// 512-bit key - Sequence [237,84,86,180,18,177,218,25,127,183,17,35,172,211,167,41,144,29,26,113,135,71,0,19,49,7,236,83,48,100,4,48,123] appears 136 times
// 521-bit key - Sequence [155,198,104,66,174,205,161,42,230,163,128,230,40,129,255,47,45,130,198,133,40,170,96,86,88,58,72,243,48,129,132,4,64] appears 65 times
// 521-bit key - Sequence [255,255,255,255,255,255,255,255,255,255,255,254,255,255,255,255,0,0,0,0,0,0,0,0,255,255,255,255,48,123,4,48,255] appears 24 times


