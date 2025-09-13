export function assert(cond: boolean, errorMessage: string) {
  if (!cond) {
    throw new Error(errorMessage);
  }
}

// Works only on 32 bit sha text lengths
export function int64toBytes(num: number): Uint8Array {
  const arr = new ArrayBuffer(8); // an Int32 takes 4 bytes
  const view = new DataView(arr);
  view.setInt32(4, num, false); // byteOffset = 0; litteEndian = false
  return new Uint8Array(arr);
}

// Helper function to convert 128-bit length to bytes
function int128toBytes(x: number): Uint8Array {
  const buffer = new ArrayBuffer(16);
  const view = new DataView(buffer);

  // Write high 64 bits
  view.setBigUint64(0, BigInt(0), false);
  // Write low 64 bits
  view.setBigUint64(8, BigInt(x), false);

  return new Uint8Array(buffer);
}

// Works only on 32 bit sha text lengths
export function int8toBytes(num: number): Uint8Array {
  const arr = new ArrayBuffer(1); // an Int8 takes 4 bytes
  const view = new DataView(arr);
  view.setUint8(0, num); // byteOffset = 0; litteEndian = false
  return new Uint8Array(arr);
}

export function mergeUInt8Arrays(a1: Uint8Array, a2: Uint8Array): Uint8Array {
  // sum of individual array lengths
  const mergedArray = new Uint8Array(a1.length + a2.length);
  mergedArray.set(a1);
  mergedArray.set(a2, a1.length);
  return new Uint8Array(mergedArray.buffer);
}

export function sha384_512Pad(
  prehash_prepad_m_array: number[],
  maxShaBytes: number
): [number[], number] {
  let prehash_prepad_m: Uint8Array = new Uint8Array(prehash_prepad_m_array);
  // Length in bits before padding
  const length_bits = prehash_prepad_m.length * 8;

  // For SHA-384, length is stored in 128 bits (16 bytes)
  const length_in_bytes = int128toBytes(length_bits);

  // Add the 1 bit (as a byte with value 128)
  prehash_prepad_m = mergeUInt8Arrays(prehash_prepad_m, int8toBytes(2 ** 7));

  // Add padding zeros until total length is congruent to 896 mod 1024
  while ((prehash_prepad_m.length * 8 + length_in_bytes.length * 8) % 1024 !== 0) {
    prehash_prepad_m = mergeUInt8Arrays(prehash_prepad_m, int8toBytes(0));
  }

  // Append the length
  prehash_prepad_m = mergeUInt8Arrays(prehash_prepad_m, length_in_bytes);

  // Verify padding is correct (multiple of 1024 bits)
  assert((prehash_prepad_m.length * 8) % 1024 === 0, 'Padding did not complete properly!');

  const messageLen = prehash_prepad_m.length;

  // Pad to max length if needed
  while (prehash_prepad_m.length < maxShaBytes) {
    prehash_prepad_m = mergeUInt8Arrays(prehash_prepad_m, int128toBytes(0));
  }

  assert(
    prehash_prepad_m.length === maxShaBytes,
    `Padding to max length did not complete properly! Your padded message is ${prehash_prepad_m.length} long but max is ${maxShaBytes}!`
  );

  return [Array.from(prehash_prepad_m), messageLen];
}

// Copied from zk-email cuz it uses crypto so can't import it here.
// Puts an end selector, a bunch of 0s, then the length, then fill the rest with 0s.
export function shaPad(prehash_prepad_m_array: number[], maxShaBytes: number): [number[], number] {
  let prehash_prepad_m: Uint8Array = new Uint8Array(prehash_prepad_m_array);
  const length_bits = prehash_prepad_m.length * 8; // bytes to bits
  const length_in_bytes = int64toBytes(length_bits);
  prehash_prepad_m = mergeUInt8Arrays(prehash_prepad_m, int8toBytes(2 ** 7)); // Add the 1 on the end, length 505
  while ((prehash_prepad_m.length * 8 + length_in_bytes.length * 8) % 512 !== 0) {
    prehash_prepad_m = mergeUInt8Arrays(prehash_prepad_m, int8toBytes(0));
  }
  prehash_prepad_m = mergeUInt8Arrays(prehash_prepad_m, length_in_bytes);
  assert((prehash_prepad_m.length * 8) % 512 === 0, 'Padding did not complete properly!');
  const messageLen = prehash_prepad_m.length;
  while (prehash_prepad_m.length < maxShaBytes) {
    prehash_prepad_m = mergeUInt8Arrays(prehash_prepad_m, int64toBytes(0));
  }
  assert(
    prehash_prepad_m.length === maxShaBytes,
    `Padding to max length did not complete properly! Your padded message is ${prehash_prepad_m.length} long but max is ${maxShaBytes}!`
  );
  return [Array.from(prehash_prepad_m), messageLen];
}
