export function bytesToIntChunks(bytes: Uint8Array, maxBytesInField: number): bigint[] {
  const numChunks = Math.ceil(bytes.length / maxBytesInField);
  const ints: bigint[] = new Array(numChunks).fill(BigInt(0));

  for (let i = 0; i < numChunks; i++) {
    let intSum = BigInt(0);
    for (let j = 0; j < maxBytesInField; j++) {
      const idx = maxBytesInField * i + j;
      if (idx >= bytes.length) break; // Stop if we've processed all bytes

      // Shift byte into position and add to current integer sum
      intSum += BigInt(bytes[idx]) * BigInt(256) ** BigInt(j);
    }
    ints[i] = intSum;
  }

  return ints;
}

export function padArrayWithZeros(bigIntArray: bigint[], requiredLength: number) {
  const currentLength = bigIntArray.length;
  const zerosToFill = requiredLength - currentLength;

  if (zerosToFill > 0) {
    return [...bigIntArray, ...Array(zerosToFill).fill(BigInt(0))];
  }

  return bigIntArray;
}

export function bigIntChunksToByteArray(bigIntChunks: bigint[], bytesPerChunk = 31) {
  const bytes: number[] = [];

  // Remove last chunks that are 0n
  const cleanChunks = bigIntChunks
    .reverse()
    .reduce((acc: bigint[], item) => (acc.length || item !== 0n ? [...acc, item] : []), [])
    .reverse();

  cleanChunks.forEach((bigInt, i) => {
    let byteCount = 0;

    while (bigInt > 0n) {
      bytes.unshift(Number(bigInt & 0xffn));
      bigInt >>= 8n;
      byteCount++;
    }

    // Except for the last chunk, each chunk should be of size bytesPerChunk
    // This will add 0s that were removed during the conversion because they are LSB
    if (i < cleanChunks.length - 1) {
      if (byteCount < bytesPerChunk) {
        for (let j = 0; j < bytesPerChunk - byteCount; j++) {
          bytes.unshift(0);
        }
      }
    }
  });

  return bytes.reverse(); // reverse to convert big endian to little endian
}

export function bigIntsToString(bigIntChunks: bigint[]) {
  return bigIntChunksToByteArray(bigIntChunks)
    .map((byte) => String.fromCharCode(byte))
    .join('');
}

export function ProcessReferenceId(referenceId: string): {
  last4Digits: string;
  // timestamp: number;
} {
  const last4Digits = referenceId.slice(0, 4);
  const tsFull = referenceId.slice(4);
  // console.log(tsFull)      // e.g. "20190308114407437"
  const tsHour = tsFull.slice(0, 10); // "YYYYMMDDHH"
  const year = Number(tsHour.slice(0, 4));
  const month = Number(tsHour.slice(4, 6));
  const day = Number(tsHour.slice(6, 8));
  const hour = Number(tsHour.slice(8, 10));

  // const msAtUtcHour = Date.UTC(year, month - 1, day, hour);
  // const istOffsetMs = (5 * 60 + 30) * 60 * 1000;
  // const msUtc       = msAtUtcHour - istOffsetMs;

  // const timestamp = Math.floor(msUtc / 1000);

  return { last4Digits };
}

// Takes in a string say name and converts it into a byte array and padding till lenght
// useful for namehash
export function convertStringToByteArrayPad(name:string,maxNameBytes: number): Uint8Array  {
  const encoder = new TextEncoder();
  const nameBytes = encoder.encode(name);        // UTF-8 encode

  if (nameBytes.length > maxNameBytes) {
    throw new Error(
      `String too long: encoded length ${nameBytes.length} > max ${maxNameBytes}`
    );
  }

  // Allocate a zero-filled buffer of the target size
  const padded = new Uint8Array(maxNameBytes);

  // Copy the name bytes into the start of the buffer
  padded.set(nameBytes, 0);

  return padded;
}

