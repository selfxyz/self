function writeBigEndian64(buf: Uint8Array, offset: number, value: number) {
  const view = new DataView(buf.buffer, buf.byteOffset);
  view.setInt32(offset, 0, false);
  view.setInt32(offset + 4, value, false);
}

function writeBigEndian128(buf: Uint8Array, offset: number, value: number) {
  const view = new DataView(buf.buffer, buf.byteOffset);
  view.setBigUint64(offset, 0n, false);
  view.setBigUint64(offset + 8, BigInt(value), false);
}

export function mergeUInt8Arrays(a1: Uint8Array, a2: Uint8Array): Uint8Array {
  const merged = new Uint8Array(a1.length + a2.length);
  merged.set(a1);
  merged.set(a2, a1.length);
  return merged;
}

function paddedLength(msgLen: number, lengthFieldBytes: number, blockBytes: number): number {
  // msg + 0x80 byte + length field, rounded up to next block boundary
  return Math.ceil((msgLen + 1 + lengthFieldBytes) / blockBytes) * blockBytes;
}

export function shaPad(prehash_prepad_m_array: number[], maxShaBytes: number): [number[], number] {
  const msgLen = prehash_prepad_m_array.length;
  const paddedLen = paddedLength(msgLen, 8, 64);

  if (paddedLen > maxShaBytes) {
    throw new Error(`Padded message is ${paddedLen} bytes but max is ${maxShaBytes}`);
  }

  const result = new Uint8Array(maxShaBytes);
  result.set(prehash_prepad_m_array);
  result[msgLen] = 0x80;
  writeBigEndian64(result, paddedLen - 8, msgLen * 8);

  return [Array.from(result), paddedLen];
}

export function sha384_512Pad(
  prehash_prepad_m_array: number[],
  maxShaBytes: number,
): [number[], number] {
  const msgLen = prehash_prepad_m_array.length;
  const paddedLen = paddedLength(msgLen, 16, 128);

  if (paddedLen > maxShaBytes) {
    throw new Error(`Padded message is ${paddedLen} bytes but max is ${maxShaBytes}`);
  }

  const result = new Uint8Array(maxShaBytes);
  result.set(prehash_prepad_m_array);
  result[msgLen] = 0x80;
  writeBigEndian128(result, paddedLen - 16, msgLen * 8);

  return [Array.from(result), paddedLen];
}
