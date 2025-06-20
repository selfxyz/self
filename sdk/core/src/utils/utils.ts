import { unpackReveal } from "@selfxyz/common/utils/circuits/formatOutputs";

export function unpackForbiddenCountriesList(forbiddenCountriesList_packed: string[]) {
  const trimmed = unpackReveal(forbiddenCountriesList_packed, 'id');
  const countries = [];
  for (let i = 0; i < trimmed.length; i += 3) {
    const countryCode = trimmed.slice(i, i + 3).join('');
    if (countryCode.length === 3) {
      countries.push(countryCode);
    }
  }
  return countries;
}
