export function bytesToIntChunks(
  bytes: Uint8Array,
  maxBytesInField: number,
): bigint[] {
  const numChunks = Math.ceil(bytes.length / maxBytesInField)
  const ints: bigint[] = new Array(numChunks).fill(BigInt(0))

  for (let i = 0; i < numChunks; i++) {
    let intSum = BigInt(0)
    for (let j = 0; j < maxBytesInField; j++) {
      const idx = maxBytesInField * i + j
      if (idx >= bytes.length) break // Stop if we've processed all bytes

      // Shift byte into position and add to current integer sum
      intSum += BigInt(bytes[idx]) * BigInt(256) ** BigInt(j)
    }
    ints[i] = intSum
  }

  return ints
}

export function padArrayWithZeros(
  bigIntArray: bigint[],
  requiredLength: number,
) {
  const currentLength = bigIntArray.length
  const zerosToFill = requiredLength - currentLength

  if (zerosToFill > 0) {
    return [...bigIntArray, ...Array(zerosToFill).fill(BigInt(0))]
  }

  return bigIntArray
}

export function bigIntChunksToByteArray(
  bigIntChunks: bigint[],
  bytesPerChunk = 31,
) {
  const bytes: number[] = []

  // Remove last chunks that are 0n
  const cleanChunks = bigIntChunks
    .reverse()
    .reduce(
      (acc: bigint[], item) =>
        acc.length || item !== 0n ? [...acc, item] : [],
      [],
    )
    .reverse()

  cleanChunks.forEach((bigInt, i) => {
    let byteCount = 0

    while (bigInt > 0n) {
      bytes.unshift(Number(bigInt & 0xffn))
      bigInt >>= 8n
      byteCount++
    }

    // Except for the last chunk, each chunk should be of size bytesPerChunk
    // This will add 0s that were removed during the conversion because they are LSB
    if (i < cleanChunks.length - 1) {
      if (byteCount < bytesPerChunk) {
        for (let j = 0; j < bytesPerChunk - byteCount; j++) {
          bytes.unshift(0)
        }
      }
    }
  })

  return bytes.reverse() // reverse to convert big endian to little endian
}

export function bigIntsToString(bigIntChunks: bigint[]) {
  return bigIntChunksToByteArray(bigIntChunks)
    .map(byte => String.fromCharCode(byte))
    .join('')
}