export function getFirstName(mrz: string): string {
  const names = mrz.split("<<");
  const firstName = names[1].split("<")[0].trim();
  const capitalized = firstName.charAt(0) + firstName.slice(1).toLowerCase();
  return capitalized || "Unknown";
}

export function formatDuration(durationInMs: number) {
  const durationInSeconds = durationInMs / 1000;
  const minutes = Math.floor((durationInSeconds % 3600) / 60);
  const seconds = Math.floor(durationInSeconds % 60);

  if (minutes > 0) {
    return `${minutes}m ${seconds}s`;
  } else if (seconds > 0) {
    return `${seconds}s`;
  } else {
    return `${durationInMs}ms`;
  }
}
export function checkInputs(
  passportNumber: string,
  dateOfBirth: string,
  dateOfExpiry: string,
): { success: boolean, message: string } {
  // if (passportNumber.length !== 9) {
  //   throw new Error('Passport number must be 9 characters long');
  // }
  if (dateOfBirth.length !== 6) {
    return {
      success: false,
      message: 'Complete Step 1 first'
    };
  }
  if (dateOfExpiry.length !== 6) {
    return {
      success: false,
      message: 'Date of expiry must be 6 characters long'
    };
  }

  return {
    success: true,
    message: ''
  };
}

export const maskString = (input: string): string => {
  if (input.length <= 5) {
    return input.charAt(0) + '*'.repeat(input.length - 1);
  } else {
    return input.charAt(0) + input.charAt(1) + '*'.repeat(input.length - 2);
  }
}

export const getTx = (input: string | null): string => {
  if (!input) return '';
  const transaction = input.split(' ').filter(word => word.startsWith('0x')).join(' ');
  return transaction;
}

export const shortenTxHash = (input: string | null): string => {
  if (!input) return '';
  if (input.length > 9) {
    return input.substring(0, 25) + '\u2026';
  } else {
    return input;
  }
}
