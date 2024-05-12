// Function to extract information from a two-line MRZ.

import { countryCodes } from "../../../common/src/constants/constants";
import { Proof } from "../../../common/src/utils/types";

// The actual parsing would depend on the standard being used (TD1, TD2, TD3, MRVA, MRVB).
export function extractMRZInfo(mrzString: string) {
  const mrzLines = mrzString.split('\n');

  if (mrzLines.length < 2) {
    throw new Error('Invalid MRZ format: Expected two lines of MRZ data');
  }

  let documentNumber = mrzLines[1].slice(0, 9).replace(/</g, '').trim();
  const birthDate = mrzLines[1].slice(13, 19).trim();
  const expiryDate = mrzLines[1].slice(21, 27).trim();

  return {
    documentNumber,
    birthDate,
    expiryDate
  };
}

// Function to format date from 'YYYY-MM-DD 00:00:00 +0000' to 'YYMMDD'
export function formatDateToYYMMDD(inputDate: string) {
  // Extract the date components directly from the input string
  const year = inputDate.substring(2, 4); // Get YY part
  const month = inputDate.substring(5, 7); // Get MM part
  const day = inputDate.substring(8, 10); // Get DD part

  // Concatenate components into YYMMDD format
  return year + month + day;
}

export const Steps = {
  MRZ_SCAN: 1,
  MRZ_SCAN_COMPLETED: 2,
  NFC_SCANNING: 3,
  NFC_SCAN_COMPLETED: 4,
  APP_SELECTED: 5,
  GENERATING_PROOF: 6,
  PROOF_GENERATED: 7,
  TX_MINTING: 8,
  TX_MINTED: 9
};

export function formatAttribute(key: string, attribute: string) {
  if (key === 'expiry_date') {
    const year = '20' + attribute.substring(0, 2); // Assuming all expiry dates are in the 2000s
    const month = attribute.substring(2, 4);
    const day = attribute.substring(4, 6);
    return `${year}-${month}-${day}`; // ISO 8601 format (YYYY-MM-DD)
  } else if (key === 'nationality' && attribute in countryCodes) {
    return countryCodes[attribute as keyof typeof countryCodes]
  }
  return attribute;
}

export const parseProofAndroid = (response: string) => {
  const match = response.match(/ZkProof\(proof=Proof\(pi_a=\[(.*?)\], pi_b=\[\[(.*?)\], \[(.*?)\], \[1, 0\]\], pi_c=\[(.*?)\], protocol=groth16, curve=bn128\), pub_signals=\[(.*?)\]\)/);

  if (!match) throw new Error('Invalid input format');

  const [, pi_a, pi_b_1, pi_b_2, pi_c, pub_signals] = match;

  return {
    proof: {
      a: pi_a.split(',').map((n: string) => n.trim()),
      b: [
        pi_b_1.split(',').map((n: string) => n.trim()),
        pi_b_2.split(',').map((n: string) => n.trim()),
      ],
      c: pi_c.split(',').map((n: string) => n.trim()),
    },
    pub_signals: pub_signals.split(',').map((n: string) => n.trim())
  } as Proof;
};