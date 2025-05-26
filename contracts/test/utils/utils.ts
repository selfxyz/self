import { randomBytes, toBigInt, toBeHex, zeroPadValue } from "ethers";

export function generateRandomFieldElement(): string {
  const FIELD_PRIME = BigInt("21888242871839275222246405745257275088696311157297823662689037894645226208583");

  const fieldElement = zeroPadValue(toBeHex(toBigInt(randomBytes(32)) % FIELD_PRIME), 32);

  return fieldElement;
}

export function getStartOfDayTimestamp(timestamp: number): number {
  const dayInSeconds = 86400;
  return timestamp - (timestamp % dayInSeconds);
}

export function splitHexFromBack(hexString: string, bytesPerChunk: number = 31): string[] {
  if (hexString.startsWith("0x")) {
    hexString = hexString.slice(2);
  }

  const chunkSizeHex = bytesPerChunk * 2;
  const chunks: string[] = [];

  let remaining = hexString;
  while (remaining.length > 0) {
    const chunk = remaining.slice(-chunkSizeHex);
    remaining = remaining.slice(0, -chunkSizeHex);

    const paddedChunk = chunk.padStart(64, "0");
    chunks.push("0x" + paddedChunk);
  }

  return chunks;
}
