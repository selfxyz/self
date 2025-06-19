export function unpackReveal(
  revealedData_packed: string | string[],
  id_type: 'passport' | 'id'
): string[] {
  // If revealedData_packed is not an array, convert it to an array
  const packedArray = Array.isArray(revealedData_packed)
    ? revealedData_packed
    : [revealedData_packed];

  const bytesCount = id_type === 'passport' ? [31, 31, 31] : [31, 31, 31, 27]; // nb of bytes in each of the first three field elements
  const bytesArray = packedArray.flatMap((element: string, index: number) => {
    const bytes = bytesCount[index] || 31; // Use 31 as default if index is out of range
    const elementBigInt = BigInt(element);
    const byteMask = BigInt(255); // 0xFF
    const bytesOfElement = [...Array(bytes)].map((_, byteIndex) => {
      return (elementBigInt >> (BigInt(byteIndex) * BigInt(8))) & byteMask;
    });
    return bytesOfElement;
  });

  return bytesArray.map((byte: bigint) => String.fromCharCode(Number(byte)));
}

export function unpackForbiddenCountriesList(forbiddenCountriesList_packed: string[]) {
  const trimmed = unpackReveal(forbiddenCountriesList_packed, 'id');
  const countries = [];
  for (let i = 0; i < trimmed.length; i += 3) {
    const countryCode = trimmed.slice(i, i + 3).join('');
    if (countryCode.length === 3) {
      countries.push(countryCode);
    }
  }
  return countries; // Return countries array instead of trimmed
}
