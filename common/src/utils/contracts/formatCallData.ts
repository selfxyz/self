export function formatCallData_disclose(parsedCallData: any[]) {
  return {
    nullifier: parsedCallData[3][0],
    revealedData_packed: [parsedCallData[3][1], parsedCallData[3][2], parsedCallData[3][3]],
    attestation_id: parsedCallData[3][4],
    merkle_root: parsedCallData[3][5],
    scope: parsedCallData[3][6],
    current_date: [
      parsedCallData[3][7],
      parsedCallData[3][8],
      parsedCallData[3][9],
      parsedCallData[3][10],
      parsedCallData[3][11],
      parsedCallData[3][12],
    ],
    user_identifier: parsedCallData[3][13],
    a: parsedCallData[0],
    b: [parsedCallData[1][0], parsedCallData[1][1]],
    c: parsedCallData[2],
  };
}
export function formatCallData_dsc(parsedCallData: any[]) {
  return {
    blinded_dsc_commitment: parsedCallData[3][0],
    merkle_root: parsedCallData[3][1],
    a: parsedCallData[0],
    b: [parsedCallData[1][0], parsedCallData[1][1]],
    c: parsedCallData[2],
  };
}

export function formatCallData_register(parsedCallData: any[]) {
  return {
    blinded_dsc_commitment: parsedCallData[3][0],
    nullifier: parsedCallData[3][1],
    commitment: parsedCallData[3][2],
    attestation_id: parsedCallData[3][3],
    a: parsedCallData[0],
    b: [parsedCallData[1][0], parsedCallData[1][1]],
    c: parsedCallData[2],
  };
}

export function formatProof(proof: any, publicSignals: any) {
  return {
    a: proof.a,
    b: [
      [proof.b[0][1], proof.b[0][0]],
      [proof.b[1][1], proof.b[1][0]],
    ],
    c: proof.c,
    pubSignals: publicSignals,
  };
}

export function packForbiddenCountriesList(forbiddenCountries: string[]) {
  const MAX_BYTES_IN_FIELD = 31;
  const REQUIRED_CHUNKS = 4;
  const bytes: number[] = [];

  // Validate all country codes (3 characters)
  for (const country of forbiddenCountries) {
    if (!country || country.length !== 3) {
      throw new Error(
        `Invalid country code: "${country}". Country codes must be exactly 3 characters long.`
      );
    }
  }

  // Convert countries to bytes
  for (const country of forbiddenCountries) {
    const countryCode = country.padEnd(3, ' ').slice(0, 3);
    for (const char of countryCode) {
      bytes.push(char.charCodeAt(0));
    }
  }

  // Calculate number of chunks needed
  const packSize = MAX_BYTES_IN_FIELD;
  const maxBytes = bytes.length;
  const remain = maxBytes % packSize;
  const numChunks =
    remain > 0 ? Math.floor(maxBytes / packSize) + 1 : Math.floor(maxBytes / packSize);

  // Pack bytes into chunks
  const output: `0x${string}`[] = new Array(REQUIRED_CHUNKS).fill('0x' + '0'.repeat(64));
  for (let i = 0; i < numChunks; i++) {
    let sum = BigInt(0);
    for (let j = 0; j < packSize; j++) {
      const idx = packSize * i + j;
      if (idx < maxBytes) {
        const value = BigInt(bytes[idx]);
        const shift = BigInt(8 * j);
        sum += value << shift;
      }
    }
    const hexString = sum.toString(16).padStart(64, '0');
    output[i] = ('0x' + hexString) as `0x${string}`;
  }

  return output;
}
