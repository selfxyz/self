export type UserIdType = 'hex' | 'uuid';
/// UUID
function hexToBigInt(hex: string): bigint {
  return BigInt(`0x${hex}`);
}

function checkBigInt(bigInt: bigint) {
  const max253BitValue = BigInt(2n ** 253n - 1n);
  if (bigInt > max253BitValue) {
    throw new Error('Input should be < 2^253 - 1');
  }
}

function uuidToBigInt(uuid: string): bigint {
  const hexString = uuid.replace(/-/g, '');
  const bigInt = hexToBigInt(hexString);
  return bigInt;
}

export function bigIntToHex(bigInt: bigint): string {
  return bigInt.toString(16).padStart(32, '0');
}

export function castFromScope(scope: string): string {
  checkStringLength(scope);
  return stringToBigInt(scope).toString();
}

export function castFromUUID(uuid: string): string {
  const bigInt = uuidToBigInt(uuid);
  checkBigInt(bigInt);
  return bigInt.toString();
}

export function castToAddress(bigInt: bigint): string {
  return `0x${bigInt.toString(16).padStart(40, '0')}`;
}

export function castToScope(num: bigint): string {
  const str = num.toString().slice(1); // Remove leading '1'
  const charCodes = str.match(/.{1,3}/g) || [];
  return String.fromCharCode(...charCodes.map((code) => parseInt(code, 10)));
}

export function castToUUID(bigInt: bigint): string {
  const hex = bigIntToHex(bigInt);
  return hexToUUID(hex);
}

/// scope
function checkStringLength(str: string) {
  if (str.length > 25) {
    throw new Error('Input string must not exceed 25 characters');
  }
}

function stringToBigInt(str: string): bigint {
  return BigInt(
    '1' +
      Array.from(str)
        .map((char) => char.charCodeAt(0).toString().padStart(3, '0'))
        .join('')
  );
}

export function castToUserIdentifier(bigInt: bigint, user_identifier_type: UserIdType): string {
  switch (user_identifier_type) {
    case 'hex':
      return castToAddress(bigInt);
    case 'uuid':
      return castToUUID(bigInt);
  }
}

export function hexToUUID(hex: string): string {
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

export function stringToAsciiBigIntArray(str: string): bigint[] {
  const asciiBigIntArray = [];
  for (let i = 0; i < str.length; i++) {
    asciiBigIntArray.push(BigInt(str.charCodeAt(i)));
  }
  return asciiBigIntArray;
}

export function validateUserId(userId: string, type: UserIdType): boolean {
  switch (type) {
    case 'hex':
      return /^[0-9A-Fa-f]+$/.test(userId);
    case 'uuid':
      return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        userId
      );
    default:
      return false;
  }
}
