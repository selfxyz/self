// Function to extract information from a two-line MRZ.
import { countryCodes } from '../../../common/src/constants/constants';
import { Proof } from '../../../common/src/utils/types';

// The actual parsing would depend on the standard being used (TD1, TD2, TD3, MRVA, MRVB).
export function extractMRZInfo(mrzString: string) {
  const mrzLines = mrzString.split('\n');

  if (mrzLines.length < 2) {
    throw new Error('Invalid MRZ format: Expected two lines of MRZ data');
  }

  let passportNumber = mrzLines[1].slice(0, 9).replace(/</g, '').trim();
  const dateOfBirth = mrzLines[1].slice(13, 19).trim();
  const dateOfExpiry = mrzLines[1].slice(21, 27).trim();

  return {
    passportNumber,
    dateOfBirth,
    dateOfExpiry,
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

export const ModalProofSteps = {
  MODAL_REQUEST_SENT: 1,
  MODAL_SERVER_ERROR: 2,
  MODAL_SERVER_SUCCESS: 3,
};

export function formatAttribute(key: string, attribute: string) {
  if (key === 'expiry_date') {
    const year = '20' + attribute.substring(0, 2); // Assuming all expiry dates are in the 2000s
    const month = attribute.substring(2, 4);
    const day = attribute.substring(4, 6);
    return `${year}-${month}-${day}`; // ISO 8601 format (YYYY-MM-DD)
  } else if (key === 'nationality' && attribute in countryCodes) {
    return countryCodes[attribute as keyof typeof countryCodes];
  } else if (key === 'date_of_birth') {
    let year = '19' + attribute.substring(0, 2);
    const currentYear = 2024;
    const birthYear = parseInt(year); // eslint-disable-line radix
    if (currentYear - birthYear > 100) {
      year = '20' + attribute.substring(0, 2);
    }
    const month = attribute.substring(2, 4);
    const day = attribute.substring(4, 6);
    return `${year}-${month}-${day}`; // ISO 8601 format (YYYY-MM-DD)
  }
  return attribute;
}

export const parseProofAndroid = (response: string) => {
  const match = response.match(
    /ZkProof\(proof=Proof\(pi_a=\[(.*?)\], pi_b=\[\[(.*?)\], \[(.*?)\], \[1, 0\]\], pi_c=\[(.*?)\], protocol=groth16, curve=bn128\), pub_signals=\[(.*?)\]\)/,
  );

  if (!match) {
    throw new Error('Invalid input format');
  }

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
    pub_signals: pub_signals.split(',').map((n: string) => n.trim()),
  } as Proof;
};

export function getFirstName(mrz: string): string {
  const names = mrz.split('<<');
  const firstName = names[1].split('<')[0].trim();
  const capitalized = firstName.charAt(0) + firstName.slice(1).toLowerCase();
  return capitalized || 'Unknown';
}

export function checkInputs(
  passportNumber: string,
  dateOfBirth: string,
  dateOfExpiry: string,
): { success: boolean; message: string } {
  // if (passportNumber.length !== 9) {
  //   throw new Error('Passport number must be 9 characters long');
  // }
  if (dateOfBirth.length !== 6) {
    return {
      success: false,
      message: 'Complete Step 1 first',
    };
  }
  if (dateOfExpiry.length !== 6) {
    return {
      success: false,
      message: 'Date of expiry must be 6 characters long',
    };
  }

  return {
    success: true,
    message: '',
  };
}

export const maskString = (input: string): string => {
  if (input.length <= 5) {
    return input.charAt(0) + '*'.repeat(input.length - 1);
  } else {
    return input.charAt(0) + input.charAt(1) + '*'.repeat(input.length - 2);
  }
};
