import * as fs from 'fs';
import * as path from 'path';
import { parseCertificateSimple } from '../../../common/src/utils/certificate_parsing/parseCertificateSimple';

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

  const overallSequenceMatchCounts = [0, 0, 0]; // Initialize overall counters for each sequence
  const multipleMatches = [];

  for (let i = 0; i < certificates.length; i++) {
    const pemContent = certificates[i];
    const parsed = parseCertificateSimple(pemContent);
    if (parsed.signatureAlgorithm === 'ecdsa') {
      continue;
    }

    // if (i === 24100) {
    //   console.log("pemContent", pemContent);
    //   return
    // }

    const tbsBytesArray = Array.from(parsed.tbsBytes);
    if (parsed.signatureAlgorithm === 'rsa' || parsed.signatureAlgorithm === 'rsapss') {
      const sequences = [
        [2, 130, 1, 1, 0], // 2048 bits, 23963 matches
        [2, 130, 2, 1, 0], // 2048 bits, 200 matches
        [2, 130, 1, 129, 0], // 3072 bits, 528 matches
        // a few certs between 23502 and 23527 and around have 1024 bits
        // they have [2, 129, 129, 0, 210/186/194...]
        // we don't support them.
      ];

      let matchCount = 0;

      sequences.forEach((sequence, index) => {
        const sequenceString = sequence.join(',');
        const tbsString = tbsBytesArray.join(',');
        const currentMatchCount = (tbsString.match(new RegExp(sequenceString, 'g')) || []).length;
        if (currentMatchCount > 0) {
          matchCount += currentMatchCount;
          overallSequenceMatchCounts[index] += currentMatchCount;
          if (currentMatchCount > 1) {
            multipleMatches.push(i, currentMatchCount, sequenceString);
          }
        }
      });

      if (matchCount > 1) {
        console.log(`Certificate ${i} with ${parsed.signatureAlgorithm} has sequences matched ${matchCount} times.`);
        console.log('tbsBytesArray:', JSON.parse(JSON.stringify(tbsBytesArray)));
      }

      if (matchCount === 0) {
        console.log(`Certificate ${i} with ${parsed.signatureAlgorithm} missing expected byte sequence`);
      }
    }

    if (i > 0 && i % 100 === 0) {
      console.log(`Processed ${i} certificates...`);
    }
  }

  // Log the overall number of matches for each sequence
  console.log(`Overall sequence match counts:`);
  console.log(`[2, 130, 1, 1, 0]: ${overallSequenceMatchCounts[0]}`);
  console.log(`[2, 130, 2, 1, 0]: ${overallSequenceMatchCounts[1]}`);
  console.log(`[2, 130, 1, 129, 0]: ${overallSequenceMatchCounts[2]}`);

  console.log(`Certificate with multiple sequence matches: ${multipleMatches}`);
}

extractMasterlistDsc();