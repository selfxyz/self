export function stringToAsciiArray(str: string) {
  return str.split('').map((char) => char.charCodeAt(0));
}
