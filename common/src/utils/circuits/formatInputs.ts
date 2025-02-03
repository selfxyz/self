import { MAX_FORBIDDEN_COUNTRIES_LIST_LENGTH } from "../../constants/constants";

export function formatCountriesList(countries: string[]) {
    if (countries.length > MAX_FORBIDDEN_COUNTRIES_LIST_LENGTH) {
        throw new Error(`Countries list must be inferior or equals to ${MAX_FORBIDDEN_COUNTRIES_LIST_LENGTH}`);
    }
    const paddedCountries = countries.concat(Array(MAX_FORBIDDEN_COUNTRIES_LIST_LENGTH - countries.length).fill(''));
    const result = paddedCountries.flatMap((country) => {
        const chars = country
            .padEnd(3, '\0')
            .split('')
            .map((char) => char.charCodeAt(0));
        return chars;
    });
    return result;
}

export function reverseBytes(input: string): string {
    const hex = input.slice(2);
    
    const bytes = hex.match(/.{2}/g) || [];
    
    const reversedBytes = bytes.reverse();
    
    return '0x' + reversedBytes.join('');
}

export function reverseCountryBytes(input: string): string {
    const hex = input.slice(2);
    const groups = hex.match(/.{6}/g) || [];
    const reversedGroups = groups.reverse();
  
    const remainderLength = hex.length % 6;
    let remainder = "";
    if (remainderLength > 0) {
      remainder = hex.slice(hex.length - remainderLength);
    }
  
    return '0x' + reversedGroups.join('') + remainder;
}