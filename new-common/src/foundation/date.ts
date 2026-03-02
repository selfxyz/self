export function getCurrentDateYYMMDD(dayDiff: number = 0): number[] {
  const date = new Date();
  date.setDate(date.getDate() + dayDiff); // Adjust the date by the dayDiff
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth() + 1;
  const day = date.getUTCDate();
  const YY = `0${year % 100}`.slice(-2);
  const MM = `0${month}`.slice(-2);
  const DD = `0${day}`.slice(-2);

  const yymmdd = `${YY}${MM}${DD}`;
  return Array.from(yymmdd).map(char => parseInt(char));
}

export function yearFractionToYYMMDD(yearFraction: number): string {
  // Separate the year and the fractional part
  const year = yearFraction;
  const fraction = yearFraction - Math.floor(yearFraction);

  // Convert the fractional part into months (0-11)
  const monthsFromFraction = Math.floor(fraction * 12);

  // Assuming the first day of the month for simplicity
  const day = 1;

  // Format year, month, and day into YYMMDD string
  const YY = `0${Math.floor(year) % 100}`.slice(-2);
  const MM = `0${monthsFromFraction + 1}`.slice(-2); // +1 because months are 1-indexed in this format
  const DD = `0${day}`.slice(-2);

  return `${YY}${MM}${DD}`;
}

export function yymmddToByteArray(yymmdd: string): number[] {
  // Convert each character in the string to its ASCII value
  const byteArray = Array.from(yymmdd).map(char => char.charCodeAt(0));
  return byteArray;
}
