import { randomBytes, toBigInt } from "ethers";

export function generateRandomFieldElement(): bigint {
  const FIELD_PRIME = BigInt(
    "21888242871839275222246405745257275088548364400416034343698204186575808495617"
  );

  const randomBytesArray = randomBytes(32);
  const randomBigInt = toBigInt(randomBytesArray);
  const fieldElement = randomBigInt % FIELD_PRIME;

  return fieldElement;
}